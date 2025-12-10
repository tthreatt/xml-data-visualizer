import { useState } from 'react';
import { XmlNode } from '../types/xml';
import { CsvNode } from '../types/csv';
import './TreeView.css';

interface TreeViewProps {
  data: XmlNode | CsvNode;
}

export default function TreeView({ data }: TreeViewProps) {
  return (
    <div className="tree-view">
      <TreeNode node={data} level={0} />
    </div>
  );
}

interface TreeNodeProps {
  node: XmlNode | CsvNode;
  level: number;
}

function TreeNode({ node, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels

  // Check if node is XmlNode or CsvNode
  const isXmlNode = (n: XmlNode | CsvNode): n is XmlNode => {
    return 'tag' in n;
  };

  const hasChildren = node.children.length > 0;
  const indent = level * 20;
  const nodeName = isXmlNode(node) ? node.tag : node.name;
  const nodeValue = isXmlNode(node) ? node.text : node.value;
  const nodePath = node.path;
  const nodeAttributes = node.attributes || {};

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleCopyXPath = () => {
    const pathToCopy =
      isXmlNode(node) && 'xpath' in node ? node.xpath : nodePath;
    navigator.clipboard.writeText(pathToCopy);
    // Could add a toast notification here
  };

  return (
    <div className="tree-node" style={{ marginLeft: `${indent}px` }}>
      <div className="tree-node-header">
        <button
          className={`expand-button ${hasChildren ? '' : 'no-children'}`}
          onClick={handleToggle}
          disabled={!hasChildren}
        >
          {hasChildren && (isExpanded ? '▼' : '▶')}
        </button>
        <span className="node-tag" onClick={handleToggle}>
          {nodeName}
        </span>
        {nodeAttributes && Object.keys(nodeAttributes).length > 0 && (
          <span className="node-attributes">
            {Object.entries(nodeAttributes).map(([key, value]) => (
              <span key={key} className="attribute">
                {key}="{value}"
              </span>
            ))}
          </span>
        )}
        {nodeValue && <span className="node-text">: {nodeValue}</span>}
        <button
          className="copy-xpath-button"
          onClick={handleCopyXPath}
          title="Copy Path"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-node-children">
          {node.children.map((child, index) => (
            <TreeNode key={index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
