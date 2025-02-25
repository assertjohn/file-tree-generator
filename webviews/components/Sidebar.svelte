<script lang="ts">
  import { onMount } from 'svelte';
  import { tsvscode } from '../vscode';
  import type { FileNode } from './types';
  import TreeNode from './Node.svelte';

  export let nodes: FileNode[] = [];
  let fileTree: FileNode[] = [];
  let selectedFiles: string[] = [];

  onMount(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'fileTree') {
        fileTree = initializeTree(message.value || []);
        rebuildEntireTree(fileTree);
        updateSelectedFiles(fileTree);
      }
    };

    window.addEventListener('message', messageHandler);
    tsvscode.postMessage({ type: 'getFileTree' });

    return () => window.removeEventListener('message', messageHandler);
  });

  function sortNodes(nodes: FileNode[]): FileNode[] {
    return [...nodes].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  function initializeTree(nodes: FileNode[]): FileNode[] {
    for (const node of nodes) {
      node.expanded = node.expanded ?? false;
      node.checked = node.checked ?? false;
      node.partiallyChecked = false;
      if (node.children && node.children.length) {
        initializeTree(node.children);
      }
    }
    return sortNodes(nodes);
  }

  function toggleCheck(node: FileNode) {
    const newChecked = !node.checked;
    setAllDescendants(node, newChecked);
    updateParentStates(node);
    fileTree = fileTree;
    updateSelectedFiles(fileTree);
    tsvscode.postMessage({
      type: 'updateFileTree',
      value: fileTree
    });
  }

  function setAllDescendants(node: FileNode, state: boolean) {
    node.checked = state;
    node.partiallyChecked = false;
    if (node.children) {
      for (const child of node.children) {
        setAllDescendants(child, state);
      }
    }
  }

  function updateParentStates(node: FileNode) {
    function findParentNode(nodes: FileNode[], targetNode: FileNode): FileNode | null {
      for (const n of nodes) {
        if (n.children?.includes(targetNode)) return n;
        if (n.children) {
          const parent = findParentNode(n.children, targetNode);
          if (parent) return parent;
        }
      }
      return null;
    }

    let parent = findParentNode(fileTree, node);
    while (parent) {
      const allChecked = parent.children?.every(child => child.checked) ?? false;
      const someChecked = parent.children?.some(child => child.checked || child.partiallyChecked) ?? false;
      if (allChecked) {
        parent.checked = true;
        parent.partiallyChecked = false;
      } else if (someChecked) {
        parent.checked = false;
        parent.partiallyChecked = true;
      } else {
        parent.checked = false;
        parent.partiallyChecked = false;
      }
      parent = findParentNode(fileTree, parent);
    }
  }

  function toggleExpand(node: FileNode) {
    if (node.type === 'directory') {
      node.expanded = !node.expanded;
      fileTree = fileTree;
      tsvscode.postMessage({
        type: 'updateFileTree',
        value: fileTree
      });
    }
  }

  function rebuildEntireTree(nodes: FileNode[]) {
    for (const node of nodes) {
      if (node.children?.length) {
        rebuildEntireTree(node.children);
        updateDirectoryCheckState(node);
      }
    }
  }

  function updateDirectoryCheckState(dirNode: FileNode) {
    if (!dirNode.children) return;
    const total = dirNode.children.length;
    let checkedCount = 0, partialCount = 0;
    for (const child of dirNode.children) {
      if (child.checked) checkedCount++;
      if (child.partiallyChecked) partialCount++;
    }
    if (checkedCount === total) {
      dirNode.checked = true;
      dirNode.partiallyChecked = false;
    } else if (checkedCount === 0 && partialCount === 0) {
      dirNode.checked = false;
      dirNode.partiallyChecked = false;
    } else {
      dirNode.checked = false;
      dirNode.partiallyChecked = true;
    }
  }

  function updateSelectedFiles(nodes: FileNode[]) {
    const result: string[] = [];
    function traverse(node: FileNode) {
      if (node.type === 'file') {
        if (node.checked) result.push(node.path);
      } else if (node.type === 'directory') {
        if (node.checked && !node.partiallyChecked) {
          gatherAllFiles(node, result);
        } else if (node.children) {
          for (const child of node.children) traverse(child);
        }
      }
    }
    for (const rootNode of nodes) traverse(rootNode);
    selectedFiles = result;
  }

  function gatherAllFiles(dirNode: FileNode, result: string[]) {
    if (!dirNode.children) return;
    for (const child of dirNode.children) {
      if (child.type === 'file') {
        result.push(child.path);
      } else if (child.type === 'directory') {
        gatherAllFiles(child, result);
      }
    }
  }

  function copyToClipboard() {
    if (selectedFiles.length === 0) {
      tsvscode.postMessage({
        type: 'onInfo',
        value: 'Please select at least one file'
      });
      return;
    }
    tsvscode.postMessage({ type: 'copyToClipboard', files: selectedFiles });
  }

  function generateFileTree() {
    if (selectedFiles.length === 0) {
      tsvscode.postMessage({
        type: 'onInfo',
        value: 'Please select at least one file'
      });
      return;
    }
    tsvscode.postMessage({ type: 'generateFileTree', files: selectedFiles });
  }

  function selectAll() {
    for (const node of fileTree) {
      setAllDescendants(node, true);
    }
    rebuildEntireTree(fileTree);
    updateSelectedFiles(fileTree);
    fileTree = fileTree;
    tsvscode.postMessage({ type: 'updateFileTree', value: fileTree });
  }

  function deselectAll() {
    for (const node of fileTree) {
      setAllDescendants(node, false);
    }
    rebuildEntireTree(fileTree);
    updateSelectedFiles(fileTree);
    fileTree = fileTree;
    tsvscode.postMessage({ type: 'updateFileTree', value: fileTree });
  }
</script>
<style>
  :global(body) {
      padding: 0;
      margin: 0;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      background-color: var(--vscode-sideBar-background);
      border-top: 1px solid var(--vscode-sideBar-border);
  }

  .sidebar {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
  }

  .tree-container {
      flex: 1;
      overflow-y: auto;
      width: 100%;
      padding: 0;
  }

  ul {
      list-style: none;
      margin: 0;
      padding: 0;
      width: 100%;
  }

  .bottom-section {
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .selected-bar {
      width: 100%;
      padding: 8px;
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-foreground);
      font-size: 13px;
      border-radius: 4px;
      border: 1px solid var(--vscode-panel-border);
      box-sizing: border-box;
  }

  .action-row {
      width: 100%;
      display: flex;
      gap: 8px;
  }

  .btn {
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
      flex: 1;
      outline: none;
  }

  .btn-primary {
      padding: 8px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
  }

  .btn-primary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
  }

  .btn-secondary {
      padding: 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
  }

  .btn-secondary:hover {
      background: var(--vscode-button-hoverBackground);
  }
</style>

<div class="sidebar">
  <!-- File Tree -->
  <div class="tree-container">
    <ul>
      {#each (nodes && nodes.length ? nodes : fileTree) as node (node.path)}
        <TreeNode 
          {node}
          {toggleExpand}
          {toggleCheck}
          {sortNodes}
        />
      {/each}
    </ul>
  </div>

  <!-- Bottom section with actions -->
  <div class="bottom-section">
    <div class="selected-bar">
      {selectedFiles.length} files currently selected
    </div>
    <div class="action-row">
      <button class="btn btn-primary" on:click={selectAll}>Select all</button>
      <button class="btn btn-primary" on:click={deselectAll}>Deselect all</button>
    </div>
    <div class="action-row">
      <button class="btn btn-secondary" on:click={copyToClipboard}>Copy to clipboard</button>
    </div>
    <div class="action-row">
      <button class="btn btn-secondary" on:click={generateFileTree}>Generate text file</button>
    </div>
  </div>
</div>
