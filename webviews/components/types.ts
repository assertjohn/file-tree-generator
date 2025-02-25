export type FileNode = {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
    checked: boolean;
    partiallyChecked?: boolean;
    expanded?: boolean;
}; 