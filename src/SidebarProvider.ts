import * as vscode from "vscode";
import { getNonce } from "./getNonce";
import * as path from "path";

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _debounceTimer: NodeJS.Timeout | undefined;
  private _fileTree: any[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "getFileTree": {
          if (this._fileTree.length > 0) {
            webviewView.webview.postMessage({
              type: "fileTree",
              value: this._fileTree,
            });
            return;
          }

          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            try {
              const fileTree = await this.getWorkspaceFiles(workspaceFolders[0].uri);
              this._fileTree = fileTree;
              webviewView.webview.postMessage({
                type: "fileTree",
                value: fileTree,
              });
            } catch (error: any) {
              vscode.window.showErrorMessage("Error building file tree: " + error.message);
            }
          } else {
            vscode.window.showWarningMessage("No workspace folder found.");
          }
          break;
        }

        case "updateFileTree": {
          this._fileTree = data.value;
          break;
        }

        case "copyToClipboard": {
          const { files } = data;
          if (!files || !files.length) {
            vscode.window.showWarningMessage("No files selected");
            return;
          }
          try {
            const treeText = await this.generateFileTree(files);
            await vscode.env.clipboard.writeText(treeText);
            this.showAutoDismissMessage("File tree copied to clipboard!", 3000);
          } catch (error: any) {
            vscode.window.showErrorMessage("Failed to copy: " + error.message);
          }
          break;
        }

        case "generateFileTree": {
          const { files } = data;
          if (!files || !files.length) {
            vscode.window.showWarningMessage("No files selected");
            return;
          }
          try {
            const treeText = await this.generateFileTree(files);
            const document = await vscode.workspace.openTextDocument({
              content: treeText,
              language: "plaintext",
            });
            await vscode.window.showTextDocument(document, {
              preview: false,
              viewColumn: vscode.ViewColumn.One,
            });
            this.showAutoDismissMessage("File tree generated from selected files!", 3000);
          } catch (error: any) {
            vscode.window.showErrorMessage("Failed to generate file tree: " + error.message);
          }
          break;
        }

        case "onInfo": {
          if (data.value) {
            this.showAutoDismissMessage(data.value, 3000);
          }
          break;
        }

        case "onError": {
          if (data.value) {
            vscode.window.showErrorMessage(data.value);
          }
          break;
        }
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled", "sidebar.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled", "sidebar.css")
    );

    return /* html */ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy"
          content="
            default-src 'none';
            img-src ${webview.cspSource} https: data:;
            script-src 'nonce-${nonce}';
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource};
          "
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="${styleResetUri}" rel="stylesheet" />
        <link href="${styleVSCodeUri}" rel="stylesheet" />
        <link href="${styleMainUri}" rel="stylesheet" />
      </head>
      <body>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  private showAutoDismissMessage(message: string, timeout: number = 3000): void {
    vscode.window.setStatusBarMessage(message, timeout);
  }

  /**
   * Builds the file tree for the given workspace root.
   */
  private async getWorkspaceFiles(workspaceRoot: vscode.Uri): Promise<any[]> {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    return new Promise((resolve, reject) => {
      this._debounceTimer = setTimeout(async () => {
        try {
          const allFiles = await vscode.workspace.findFiles("**/*", "**/node_modules/**");
          const tree = this._buildFileTree(allFiles, workspaceRoot);
          resolve(tree);
        } catch (err) {
          reject(err);
        }
      }, 300);
    });
  }

  /**
   * Builds a hierarchical file tree (directory/file structure) from the URIs.
   */
  private _buildFileTree(files: vscode.Uri[], workspaceRoot: vscode.Uri): any[] {
    const tree: Record<string, any> = {};

    for (const file of files) {
      const relativePath = path.relative(workspaceRoot.fsPath, file.fsPath);
      const parts = relativePath.split(path.sep);
      let current = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, i + 1).join(path.sep),
            type: isFile ? "file" : "directory",
            checked: false,
            partiallyChecked: false,
            children: isFile ? [] : {},
          };
        }
        current = current[part].children;
      }
    }

    function convertToArray(obj: Record<string, any>): any[] {
      return Object.values(obj).map((node: any) => {
        const hasChildren = node.type === "directory" && node.children;
        return {
          name: node.name,
          path: node.path,
          type: node.type,
          checked: node.checked,
          partiallyChecked: node.partiallyChecked,
          children: hasChildren ? convertToArray(node.children) : [],
        };
      });
    }

    return convertToArray(tree);
  }

  /**
   * Builds a hierarchical file tree from an array of file paths.
   */
  private buildSelectedFileTree(selectedPaths: string[]): any[] {
    const tree: Record<string, any> = {};

    for (const filePath of selectedPaths) {
      const parts = filePath.split(path.sep);
      let current = tree;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, i + 1).join(path.sep),
            type: isFile ? "file" : "directory",
            children: isFile ? undefined : {}
          };
        }
        if (!isFile) {
          current = current[part].children;
        }
      }
    }

    function convertToArray(obj: Record<string, any>): any[] {
      return Object.values(obj).map(node => {
        if (node.type === "directory") {
          return {
            name: node.name,
            path: node.path,
            type: node.type,
            children: convertToArray(node.children || {})
          };
        } else {
          return node;
        }
      });
    }

    return convertToArray(tree);
  }

  /**
   * Recursively formats the file tree into a simple ASCII diagram.
   */
  private formatAsciiTree(nodes: any[], prefix: string = ''): string {
    let lines: string[] = [];
    const lastIndex = nodes.length - 1;
    nodes.forEach((node, index) => {
      const isLast = index === lastIndex;
      const pointer = isLast ? '└── ' : '├── ';
      lines.push(prefix + pointer + node.name);
      if (node.type === "directory" && node.children && node.children.length) {
        const newPrefix = prefix + (isLast ? "    " : "│   ");
        lines.push(this.formatAsciiTree(node.children, newPrefix));
      }
    });
    return lines.join('\n');
  }

  /**
   * Generates a simple ASCII file tree representation for the selected files.
   */
  private async generateFileTree(selectedPaths: string[]): Promise<string> {
    const tree = this.buildSelectedFileTree(selectedPaths);
    return this.formatAsciiTree(tree);
  }
}
