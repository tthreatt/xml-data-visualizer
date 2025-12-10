import React, { useState, useMemo } from 'react';
import './ColumnSelector.css';

interface ColumnSelectorProps {
  columns: string[];
  selectedColumns: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onClose?: () => void;
}

export default function ColumnSelector({
  columns,
  selectedColumns,
  onSelectionChange,
  onClose,
}: ColumnSelectorProps) {
  const [searchText, setSearchText] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group columns by prefix
  const columnGroups = useMemo(() => {
    const groups: Map<string, string[]> = new Map();
    
    for (const col of columns) {
      const underscoreIndex = col.indexOf('_');
      const prefix = underscoreIndex > 0 ? col.substring(0, underscoreIndex) : col;
      
      if (!groups.has(prefix)) {
        groups.set(prefix, []);
      }
      groups.get(prefix)!.push(col);
    }
    
    return groups;
  }, [columns]);

  // Filter columns by search text
  const filteredGroups = useMemo(() => {
    if (!searchText) return columnGroups;
    
    const lowerSearch = searchText.toLowerCase();
    const filtered = new Map<string, string[]>();
    
    columnGroups.forEach((cols, prefix) => {
      const matchingCols = cols.filter(col => 
        col.toLowerCase().includes(lowerSearch) || 
        prefix.toLowerCase().includes(lowerSearch)
      );
      if (matchingCols.length > 0) {
        filtered.set(prefix, matchingCols);
      }
    });
    
    return filtered;
  }, [columnGroups, searchText]);

  // Toggle group expansion
  const toggleGroup = (prefix: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(prefix)) {
      newExpanded.delete(prefix);
    } else {
      newExpanded.add(prefix);
    }
    setExpandedGroups(newExpanded);
  };

  // Toggle column selection
  const toggleColumn = (column: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(column)) {
      newSelected.delete(column);
    } else {
      newSelected.add(column);
    }
    onSelectionChange(newSelected);
  };

  // Select all columns
  const selectAll = () => {
    onSelectionChange(new Set(columns));
  };

  // Deselect all columns
  const deselectAll = () => {
    onSelectionChange(new Set());
  };

  // Select education columns
  const selectEducation = () => {
    const educationCols = columns.filter(col => 
      col.toLowerCase().includes('education') || 
      col.toLowerCase().includes('edu')
    );
    onSelectionChange(new Set(educationCols));
    // Expand education groups
    const eduGroups = new Set<string>();
    filteredGroups.forEach((cols, prefix) => {
      if (cols.some(col => educationCols.includes(col))) {
        eduGroups.add(prefix);
      }
    });
    setExpandedGroups(eduGroups);
  };

  // Toggle all columns in a group
  const toggleGroupSelection = (groupCols: string[]) => {
    const allSelected = groupCols.every(col => selectedColumns.has(col));
    const newSelected = new Set(selectedColumns);
    
    if (allSelected) {
      // Deselect all in group
      groupCols.forEach(col => newSelected.delete(col));
    } else {
      // Select all in group
      groupCols.forEach(col => newSelected.add(col));
    }
    
    onSelectionChange(newSelected);
  };

  // Check if group is fully selected
  const isGroupFullySelected = (groupCols: string[]) => {
    return groupCols.length > 0 && groupCols.every(col => selectedColumns.has(col));
  };

  // Check if group is partially selected
  const isGroupPartiallySelected = (groupCols: string[]) => {
    return groupCols.some(col => selectedColumns.has(col)) && !isGroupFullySelected(groupCols);
  };

  return (
    <div className="column-selector">
      <div className="column-selector-header">
        <h3>Select Columns</h3>
        {onClose && (
          <button className="column-selector-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="column-selector-controls">
        <input
          type="text"
          placeholder="Search columns..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="column-selector-search"
        />
        <div className="column-selector-actions">
          <button onClick={selectEducation} className="column-selector-action-btn">
            Show Education
          </button>
          <button onClick={selectAll} className="column-selector-action-btn">
            Select All
          </button>
          <button onClick={deselectAll} className="column-selector-action-btn">
            Deselect All
          </button>
        </div>
      </div>

      <div className="column-selector-content">
        <div className="column-selector-info">
          {selectedColumns.size > 0 ? (
            <span>{selectedColumns.size} of {columns.length} columns selected</span>
          ) : (
            <span>No columns selected (showing all)</span>
          )}
        </div>

        <div className="column-selector-groups">
          {Array.from(filteredGroups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([prefix, groupCols]) => {
              const isExpanded = expandedGroups.has(prefix);
              const isFullySelected = isGroupFullySelected(groupCols);
              const isPartiallySelected = isGroupPartiallySelected(groupCols);

              return (
                <div key={prefix} className="column-group">
                  <div className="column-group-header">
                    <button
                      className="column-group-toggle"
                      onClick={() => toggleGroup(prefix)}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <label className="column-group-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isFullySelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isPartiallySelected;
                        }}
                        onChange={() => toggleGroupSelection(groupCols)}
                        className="column-group-checkbox"
                      />
                      <span className="column-group-name">{prefix}</span>
                      <span className="column-group-count">({groupCols.length})</span>
                    </label>
                  </div>
                  {isExpanded && (
                    <div className="column-group-items">
                      {groupCols
                        .sort()
                        .map((col) => (
                          <label key={col} className="column-item">
                            <input
                              type="checkbox"
                              checked={selectedColumns.has(col)}
                              onChange={() => toggleColumn(col)}
                              className="column-checkbox"
                            />
                            <span className="column-name" title={col}>
                              {col.substring(prefix.length + 1) || col}
                            </span>
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
