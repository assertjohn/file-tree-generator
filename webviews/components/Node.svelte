<script lang="ts">
  import type { FileNode } from './types';

  export let node: FileNode;
  export let toggleExpand: (node: FileNode) => void;
  export let toggleCheck: (node: FileNode) => void;
  export let sortNodes: (nodes: FileNode[]) => FileNode[];
</script>

<li class="tree-item">
<div class="tree-row">
  {#if node.type === 'directory'}
    <span
      class="arrow"
      class:expanded={node.expanded}
      on:click={() => toggleExpand(node)}
    />
  {:else}
    <span style="display:inline-block;width:12px;margin-right:6px;" />
  {/if}

  <div class="checkbox-wrapper" class:partially-checked={node.partiallyChecked}>
    <input
      type="checkbox"
      checked={node.checked}
      on:change={() => toggleCheck(node)}
    />
    <span class="checkmark"></span>
  </div>

  <span
    class={"icon " + node.type}
    on:click={() => node.type === 'directory' && toggleExpand(node)}
  ></span>
  <span class="name" on:click={() => node.type === 'directory' && toggleExpand(node)}>
    {node.name}
  </span>
</div>

{#if node.type === 'directory' && node.expanded && node.children?.length}
  <ul class="tree-children">
    {#each sortNodes(node.children) as child (child.path)}
      <svelte:self
        node={child}
        {toggleExpand}
        {toggleCheck}
        {sortNodes}
      />
    {/each}
  </ul>
{/if}
</li>

<style>
  ul {
      list-style: none;
      margin: 0;
      padding: 0;
      width: 100%;
  }

  li {
      list-style-type: none;
  }

  .tree-item {
      margin: 0;
      width: 100%;
  }

  .tree-row {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      margin: 0;
      width: 100%;
      box-sizing: border-box;
  }

  .tree-children {
      margin-left: 0;
      padding-left: 12px;
      width: calc(100% - 12px);
      box-sizing: border-box;
      margin-left: 12px;
  }

  .tree-row:hover {
      background: var(--vscode-list-hoverBackground);
  }

  .checkbox-wrapper {
      position: relative;
      width: 16px;
      height: 16px;
      margin-right: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
  }

  .checkbox-wrapper input {
      position: absolute;
      width: 16px;
      height: 16px;
      opacity: 0;
      cursor: pointer;
      margin: 0;
      z-index: 1;
  }

  .checkmark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      height: 14px;
      width: 14px;
      border: 1px solid var(--vscode-checkbox-border);
      background: var(--vscode-checkbox-background);
      transition: background-color 0.1s ease;
      border-radius: 2px;
  }

  .checkbox-wrapper input:checked ~ .checkmark {
      background: var(--vscode-checkbox-selectBackground);
      border-color: var(--vscode-checkbox-selectBorder);
  }

  .checkbox-wrapper input:checked ~ .checkmark:after {
      content: "";
      position: absolute;
      left: 4px;
      top: 1px;
      width: 4px;
      height: 8px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
  }

  .partially-checked .checkmark {
      background: var(--vscode-checkbox-selectBackground);
      border-color: var(--vscode-checkbox-selectBorder);
  }

  .partially-checked .checkmark:after {
      content: "";
      position: absolute;
      left: 2px;
      top: 6px;
      width: 8px;
      height: 2px;
      background: white;
      border-radius: 1px;
  }

  .icon {
      width: 16px;
      height: 16px;
      margin-right: 6px;
      flex-shrink: 0;
  }

  .icon.directory {
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23C5C5C5' d='M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13h-12V7h12v4.49z'/%3E%3C/svg%3E") center no-repeat;
  }

  .icon.file {
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23C5C5C5' d='M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h9l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8z'/%3E%3C/svg%3E") center no-repeat;
  }

  .arrow {
      display: inline-block;
      margin-right: 6px;
      width: 12px;
      text-align: center;
      font-size: 12px;
      user-select: none;
  }

  .arrow::before {
      content: "▶";
  }

  .arrow.expanded::before {
      content: "▼";
  }

  .name {
      flex: 1;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
  }
</style>
