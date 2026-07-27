/* eslint-disable no-unused-vars -- The current flat ESLint config does not mark JSX identifiers as used. */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

const NODE_WIDTH = 190;
const NODE_HEIGHT = 76;
const DEFAULT_NODE_STYLE = {
  color: '#111827',
  fill: '#FFFFFF',
  stroke: '#334155',
};

const normalizeText = value => String(value ?? '').trim();

const escapeMermaidLabel = value =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '<br/>');

const decodeMermaidLabel = value =>
  Formatter.repairMojibake(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');

const normalizeEdgeLabel = value =>
  decodeMermaidLabel(String(value || '').replace(/^"|"$/g, '').trim());

const parseStyle = value => {
  const style = {};

  String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .forEach(item => {
      const [key, rawValue] = item.split(':');
      if (!key || !rawValue) return;
      style[key.trim()] = rawValue.trim();
    });

  return {
    color: style.color || DEFAULT_NODE_STYLE.color,
    fill: style.fill || DEFAULT_NODE_STYLE.fill,
    stroke: style.stroke || DEFAULT_NODE_STYLE.stroke,
  };
};

const parseNodeExpression = expression => {
  const raw = normalizeText(expression);
  const match = raw.match(/^([A-Za-z_][\w-]*)(?:\s*(\[\s*"([^"]*)"\s*\]|\{\s*"([^"]*)"\s*\}|\[\s*([^\]]*)\s*\]|\{\s*([^}]*)\s*\}))?/);

  if (!match) return null;

  const shapeToken = match[2] || '';
  const hasDefinition = normalizeText(shapeToken) !== '';

  return {
    hasDefinition,
    id: match[1],
    label: hasDefinition
      ? decodeMermaidLabel(match[3] || match[4] || match[5] || match[6] || match[1])
      : match[1],
    shape: shapeToken.trim().startsWith('{') ? 'diamond' : 'rect',
    style: {...DEFAULT_NODE_STYLE},
  };
};

const mergeParsedNode = (nodes, parsedNode) => {
  const currentNode = nodes.get(parsedNode.id);

  if (!currentNode) {
    nodes.set(parsedNode.id, {
      id: parsedNode.id,
      label: parsedNode.label,
      shape: parsedNode.shape,
      style: parsedNode.style,
    });
    return;
  }

  if (!parsedNode.hasDefinition) {
    return;
  }

  nodes.set(parsedNode.id, {
    ...currentNode,
    label: parsedNode.label,
    shape: parsedNode.shape,
    style: {
      ...DEFAULT_NODE_STYLE,
      ...(currentNode.style || {}),
      ...(parsedNode.style || {}),
    },
  });
};

const buildNodeExpression = node => {
  const label = escapeMermaidLabel(node.label || node.id);
  return node.shape === 'diamond'
    ? `${node.id}{"${label}"}`
    : `${node.id}["${label}"]`;
};

const parseEdgeExpression = line => {
  const labeledPipeMatch = line.match(/^(.+?)\s*-->\s*\|([^|]*)\|\s*(.+)$/);
  if (labeledPipeMatch) {
    return {
      label: normalizeEdgeLabel(labeledPipeMatch[2]),
      sourceExpression: labeledPipeMatch[1],
      targetExpression: labeledPipeMatch[3],
    };
  }

  const labeledTextMatch = line.match(/^(.+?)\s*--\s+(.+?)\s+-->\s*(.+)$/);
  if (labeledTextMatch) {
    return {
      label: normalizeEdgeLabel(labeledTextMatch[2]),
      sourceExpression: labeledTextMatch[1],
      targetExpression: labeledTextMatch[3],
    };
  }

  const plainMatch = line.match(/^(.+?)\s*-->\s*(.+)$/);
  if (!plainMatch) return null;

  return {
    label: '',
    sourceExpression: plainMatch[1],
    targetExpression: plainMatch[2],
  };
};

const parseMermaid = mermaid => {
  const source = Formatter.repairMojibake(mermaid);
  const nodes = new Map();
  const edges = [];
  const styles = new Map();

  source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .forEach(line => {
      if (/^flowchart\s+/i.test(line)) return;

      const styleMatch = line.match(/^style\s+([A-Za-z_][\w-]*)\s+(.+)$/i);
      if (styleMatch) {
        styles.set(styleMatch[1], parseStyle(styleMatch[2]));
        return;
      }

      const edgeMatch = parseEdgeExpression(line);
      if (edgeMatch) {
        const source = parseNodeExpression(edgeMatch.sourceExpression);
        const target = parseNodeExpression(edgeMatch.targetExpression);
        if (!source || !target) return;

        mergeParsedNode(nodes, source);
        mergeParsedNode(nodes, target);
        edges.push({
          id: `${source.id}-${target.id}-${edges.length}`,
          label: edgeMatch.label,
          source: source.id,
          target: target.id,
        });
        return;
      }

      const node = parseNodeExpression(line);
      if (node) {
        mergeParsedNode(nodes, node);
      }
    });

  styles.forEach((style, id) => {
    const node = nodes.get(id);
    if (!node) return;
    nodes.set(id, {...node, style: {...DEFAULT_NODE_STYLE, ...(node.style || {}), ...style}});
  });

  return {
    edges,
    nodes: Array.from(nodes.values()).map(node => ({
      ...node,
      style: {...DEFAULT_NODE_STYLE, ...(node.style || {})},
    })),
  };
};

const serializeMermaid = ({edges, nodes}) => {
  const lines = ['flowchart TD'];
  const connectedNodeIds = new Set();

  edges.forEach(edge => {
    const source = nodes.find(node => node.id === edge.source);
    const target = nodes.find(node => node.id === edge.target);
    if (!source || !target) return;

    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
    const label = normalizeText(edge.label);
    const connector = label ? `-->|${escapeMermaidLabel(label)}|` : '-->';
    lines.push(`  ${buildNodeExpression(source)} ${connector} ${buildNodeExpression(target)}`);
  });

  nodes
    .filter(node => !connectedNodeIds.has(node.id))
    .forEach(node => {
      lines.push(`  ${buildNodeExpression(node)}`);
    });

  nodes.forEach(node => {
    const style = {...DEFAULT_NODE_STYLE, ...(node.style || {})};
    if (
      style.fill !== DEFAULT_NODE_STYLE.fill ||
      style.stroke !== DEFAULT_NODE_STYLE.stroke ||
      style.color !== DEFAULT_NODE_STYLE.color
    ) {
      lines.push(`  style ${node.id} fill:${style.fill},stroke:${style.stroke},color:${style.color}`);
    }
  });

  return lines.join('\n');
};

const buildInitialPositions = (nodes, edges) => {
  const ranks = new Map();
  const incoming = new Map(nodes.map(node => [node.id, 0]));

  edges.forEach(edge => {
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
  });

  nodes.forEach(node => {
    if ((incoming.get(node.id) || 0) === 0) {
      ranks.set(node.id, 0);
    }
  });

  for (let index = 0; index < nodes.length + edges.length; index += 1) {
    let changed = false;
    edges.forEach(edge => {
      const sourceRank = ranks.get(edge.source);
      if (sourceRank === undefined) return;
      const nextRank = Math.max(ranks.get(edge.target) || 0, sourceRank + 1);
      if (nextRank !== ranks.get(edge.target)) {
        ranks.set(edge.target, nextRank);
        changed = true;
      }
    });
    if (!changed) break;
  }

  const grouped = new Map();
  nodes.forEach(node => {
    const rank = ranks.get(node.id) || 0;
    grouped.set(rank, [...(grouped.get(rank) || []), node.id]);
  });

  return nodes.reduce((positions, node, index) => {
    const rank = ranks.get(node.id) || 0;
    const group = grouped.get(rank) || [];
    const groupIndex = Math.max(group.indexOf(node.id), 0);

    positions[node.id] = {
      x: 56 + rank * 260,
      y: 56 + groupIndex * 128 + (rank % 2) * 28 + (group.length === 1 ? index % 2 * 10 : 0),
    };

    return positions;
  }, {});
};

const createNodeId = nodes => {
  let nextIndex = nodes.length + 1;
  let id = `node${nextIndex}`;

  while (nodes.some(node => node.id === id)) {
    nextIndex += 1;
    id = `node${nextIndex}`;
  }

  return id;
};

export default function FlowchartVisualEditor({
  draftMermaid,
  draftSummary,
  draftTitle,
  hasChanges,
  isSaving,
  onMermaidChange,
  onSave,
  onSummaryChange,
  onTitleChange,
  palette,
  saveError,
  saveStatus,
}) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [positions, setPositions] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedEdgeId, setSelectedEdgeId] = useState('');
  const [connectSourceId, setConnectSourceId] = useState('');
  const [showCode, setShowCode] = useState(false);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const generatedMermaidRef = useRef('');

  useEffect(() => {
    if (draftMermaid && draftMermaid === generatedMermaidRef.current) return;

    const parsed = parseMermaid(draftMermaid);
    setNodes(parsed.nodes);
    setEdges(parsed.edges);
    setPositions(buildInitialPositions(parsed.nodes, parsed.edges));
    setSelectedNodeId(current => current || parsed.nodes[0]?.id || '');
    setSelectedEdgeId('');
    setConnectSourceId('');
  }, [draftMermaid]);

  const selectedNode = useMemo(
    () => nodes.find(node => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find(edge => edge.id === selectedEdgeId) || null,
    [edges, selectedEdgeId],
  );
  const selectedNodeEdges = useMemo(
    () =>
      selectedNodeId
        ? edges.filter(edge => edge.source === selectedNodeId || edge.target === selectedNodeId)
        : [],
    [edges, selectedNodeId],
  );

  const canvasSize = useMemo(() => {
    const values = Object.values(positions);
    const maxX = Math.max(...values.map(position => position.x), 900);
    const maxY = Math.max(...values.map(position => position.y), 580);

    return {
      height: maxY + 180,
      width: maxX + 260,
    };
  }, [positions]);

  const syncMermaid = useCallback(
    (nextNodes, nextEdges) => {
      const nextMermaid = serializeMermaid({edges: nextEdges, nodes: nextNodes});
      generatedMermaidRef.current = nextMermaid;
      onMermaidChange(nextMermaid);
    },
    [onMermaidChange],
  );

  const addNode = useCallback(
    shape => {
      setNodes(currentNodes => {
        const id = createNodeId(currentNodes);
        const nextNode = {
          id,
          label: shape === 'diamond' ? 'Decisão' : 'Novo elemento',
          shape,
          style: {...DEFAULT_NODE_STYLE, stroke: palette.primary},
        };
        const nextNodes = [...currentNodes, nextNode];

        setSelectedNodeId(id);
        setPositions(currentPositions => ({
          ...currentPositions,
          [id]: {
            x: 80 + (currentNodes.length % 4) * 220,
            y: 80 + Math.floor(currentNodes.length / 4) * 132,
          },
        }));
        syncMermaid(nextNodes, edges);
        return nextNodes;
      });
    },
    [edges, palette.primary, syncMermaid],
  );

  const updateSelectedNode = useCallback(
    patch => {
      if (!selectedNodeId) return;

      setNodes(currentNodes => {
        const nextNodes = currentNodes.map(node =>
          node.id === selectedNodeId ? {...node, ...patch} : node,
        );
        syncMermaid(nextNodes, edges);
        return nextNodes;
      });
    },
    [edges, selectedNodeId, syncMermaid],
  );

  const updateSelectedStyle = useCallback(
    patch => {
      if (!selectedNodeId) return;

      setNodes(currentNodes => {
        const nextNodes = currentNodes.map(node =>
          node.id === selectedNodeId
            ? {...node, style: {...DEFAULT_NODE_STYLE, ...(node.style || {}), ...patch}}
            : node,
        );
        syncMermaid(nextNodes, edges);
        return nextNodes;
      });
    },
    [edges, selectedNodeId, syncMermaid],
  );

  const removeSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;

    setNodes(currentNodes => {
      const nextNodes = currentNodes.filter(node => node.id !== selectedNodeId);
      const nextEdges = edges.filter(edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId);

      setEdges(nextEdges);
      setPositions(currentPositions => {
        const nextPositions = {...currentPositions};
        delete nextPositions[selectedNodeId];
        return nextPositions;
      });
      setSelectedNodeId(nextNodes[0]?.id || '');
      setSelectedEdgeId('');
      syncMermaid(nextNodes, nextEdges);
      return nextNodes;
    });
  }, [edges, selectedNodeId, syncMermaid]);

  const removeEdge = useCallback(
    edgeId => {
      if (!edgeId) return;

      setEdges(currentEdges => {
        const nextEdges = currentEdges.filter(edge => edge.id !== edgeId);
        setSelectedEdgeId(current => (current === edgeId ? '' : current));
        syncMermaid(nodes, nextEdges);
        return nextEdges;
      });
    },
    [nodes, syncMermaid],
  );

  const removeSelectedEdge = useCallback(() => {
    removeEdge(selectedEdgeId);
  }, [removeEdge, selectedEdgeId]);

  const handleNodeClick = useCallback(
    nodeId => {
      if (connectSourceId && connectSourceId !== nodeId) {
        const exists = edges.some(edge => edge.source === connectSourceId && edge.target === nodeId);
        const nextEdges = exists
          ? edges
          : [
              ...edges,
              {
                id: `${connectSourceId}-${nodeId}-${Date.now()}`,
                source: connectSourceId,
                target: nodeId,
              },
            ];

        setEdges(nextEdges);
        setConnectSourceId('');
        setSelectedNodeId(nodeId);
        setSelectedEdgeId('');
        syncMermaid(nodes, nextEdges);
        return;
      }

      setSelectedNodeId(nodeId);
      setSelectedEdgeId('');
    },
    [connectSourceId, edges, nodes, syncMermaid],
  );

  const handleEdgeClick = useCallback((event, edgeId) => {
    event.stopPropagation();
    setSelectedEdgeId(edgeId);
    setSelectedNodeId('');
    setConnectSourceId('');
  }, []);

  const startDrag = useCallback((event, nodeId) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const position = positions[nodeId] || {x: 0, y: 0};

    dragRef.current = {
      nodeId,
      offsetX: event.clientX - (rect?.left || 0) - position.x,
      offsetY: event.clientY - (rect?.top || 0) - position.y,
    };
    setSelectedNodeId(nodeId);
    setSelectedEdgeId('');
    event.preventDefault();
  }, [positions]);

  useEffect(() => {
    const handleMove = event => {
      const drag = dragRef.current;
      if (!drag) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      const x = Math.max(16, event.clientX - (rect?.left || 0) - drag.offsetX);
      const y = Math.max(16, event.clientY - (rect?.top || 0) - drag.offsetY);

      setPositions(currentPositions => ({
        ...currentPositions,
        [drag.nodeId]: {x, y},
      }));
    };

    const handleUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  return (
    <div style={{...styles.panel, borderColor: palette.cardBorder}}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarGroup}>
          <button onClick={() => addNode('rect')} style={styles.toolButton} type="button">Elemento</button>
          <button onClick={() => addNode('diamond')} style={styles.toolButton} type="button">Decisão</button>
          <button
            disabled={!selectedNodeId}
            onClick={() => setConnectSourceId(selectedNodeId)}
            style={{
              ...styles.toolButton,
              ...(connectSourceId ? styles.toolButtonActive : {}),
              opacity: selectedNodeId ? 1 : 0.45,
            }}
            type="button"
          >
            Conectar
          </button>
          <button
            disabled={!selectedNodeId}
            onClick={removeSelectedNode}
            style={{...styles.toolButton, opacity: selectedNodeId ? 1 : 0.45}}
            type="button"
          >
            Remover
          </button>
          <button
            disabled={!selectedEdgeId}
            onClick={removeSelectedEdge}
            style={{...styles.toolButton, opacity: selectedEdgeId ? 1 : 0.45}}
            type="button"
          >
            Remover conexão
          </button>
          <button onClick={() => setShowCode(value => !value)} style={styles.toolButton} type="button">
            Código
          </button>
        </div>
        <button
          disabled={!hasChanges || isSaving}
          onClick={onSave}
          style={{...styles.saveButton, opacity: !hasChanges || isSaving ? 0.45 : 1}}
          type="button"
        >
          {isSaving ? 'Salvando' : 'Salvar'}
        </button>
      </div>

      <div style={styles.metaRow}>
        <input
          onChange={event => onTitleChange(event.target.value)}
          placeholder="Título do fluxo"
          style={styles.metaInput}
          value={draftTitle}
        />
        <input
          onChange={event => onSummaryChange(event.target.value)}
          placeholder="Resumo"
          style={styles.metaInput}
          value={draftSummary}
        />
      </div>

      {showCode ? (
        <textarea
          onChange={event => onMermaidChange(event.target.value)}
          spellCheck={false}
          style={styles.codeEditor}
          value={draftMermaid}
        />
      ) : null}

      <div style={styles.body}>
        <div style={styles.canvasShell}>
          <div ref={canvasRef} style={{...styles.canvas, height: canvasSize.height, width: canvasSize.width}}>
            <svg height={canvasSize.height} style={styles.edges} width={canvasSize.width}>
              <defs>
                <marker id="flow-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
                  <path d="M0,0 L8,4 L0,8 z" fill={palette.text} />
                </marker>
              </defs>
              {edges.map(edge => {
                const source = positions[edge.source];
                const target = positions[edge.target];
                if (!source || !target) return null;
                const x1 = source.x + NODE_WIDTH;
                const y1 = source.y + NODE_HEIGHT / 2;
                const x2 = target.x;
                const y2 = target.y + NODE_HEIGHT / 2;
                const midX = (x1 + x2) / 2;

                const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
                const selected = edge.id === selectedEdgeId;

                return (
                  <g key={edge.id}>
                    <path
                      d={path}
                      fill="none"
                      onClick={event => handleEdgeClick(event, edge.id)}
                      pointerEvents="stroke"
                      stroke="transparent"
                      strokeWidth="16"
                    />
                    <path
                      d={path}
                      fill="none"
                      markerEnd="url(#flow-arrow)"
                      onClick={event => handleEdgeClick(event, edge.id)}
                      pointerEvents="stroke"
                      stroke={selected ? palette.primary : palette.text}
                      strokeWidth={selected ? '3' : '1.7'}
                    />
                  </g>
                );
              })}
            </svg>
            {nodes.map(node => {
              const position = positions[node.id] || {x: 24, y: 24};
              const selected = node.id === selectedNodeId;
              const diamond = node.shape === 'diamond';

              return (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  onMouseDown={event => startDrag(event, node.id)}
                  style={{
                    ...styles.node,
                    ...(diamond ? styles.diamondNode : {}),
                    backgroundColor: node.style?.fill || DEFAULT_NODE_STYLE.fill,
                    borderColor: selected ? palette.primary : node.style?.stroke || DEFAULT_NODE_STYLE.stroke,
                    color: node.style?.color || DEFAULT_NODE_STYLE.color,
                    left: position.x,
                    top: position.y,
                    transform: diamond ? 'rotate(45deg)' : 'none',
                  }}
                  type="button"
                >
                  <span style={diamond ? styles.diamondLabel : styles.nodeLabel}>{node.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside style={{...styles.inspector, borderColor: palette.cardBorder}}>
          <div style={styles.inspectorTitle}>{selectedEdge ? 'Conexão' : 'Elemento'}</div>
          {selectedEdge ? (
            <>
              <div style={styles.edgeSummary}>
                {selectedEdge.source} → {selectedEdge.target}
                {selectedEdge.label ? ` (${selectedEdge.label})` : ''}
              </div>
              <button
                onClick={removeSelectedEdge}
                style={{...styles.toolButton, ...styles.dangerButton}}
                type="button"
              >
                Remover conexão
              </button>
              <div style={styles.hint}>Apenas esta seta será removida do Mermaid.</div>
            </>
          ) : selectedNode ? (
            <>
              <label style={styles.label}>
                Texto
                <textarea
                  onChange={event => updateSelectedNode({label: event.target.value})}
                  style={styles.nodeTextArea}
                  value={selectedNode.label}
                />
              </label>
              <label style={styles.label}>
                Formato
                <select
                  onChange={event => updateSelectedNode({shape: event.target.value})}
                  style={styles.select}
                  value={selectedNode.shape}
                >
                  <option value="rect">Retângulo</option>
                  <option value="diamond">Decisão</option>
                </select>
              </label>
              <div style={styles.colorGrid}>
                <label style={styles.label}>
                  Fundo
                  <input
                    onChange={event => updateSelectedStyle({fill: event.target.value})}
                    style={styles.colorInput}
                    type="color"
                    value={selectedNode.style?.fill || DEFAULT_NODE_STYLE.fill}
                  />
                </label>
                <label style={styles.label}>
                  Borda
                  <input
                    onChange={event => updateSelectedStyle({stroke: event.target.value})}
                    style={styles.colorInput}
                    type="color"
                    value={selectedNode.style?.stroke || DEFAULT_NODE_STYLE.stroke}
                  />
                </label>
                <label style={styles.label}>
                  Texto
                  <input
                    onChange={event => updateSelectedStyle({color: event.target.value})}
                    style={styles.colorInput}
                    type="color"
                    value={selectedNode.style?.color || DEFAULT_NODE_STYLE.color}
                  />
                </label>
              </div>
              {selectedNodeEdges.length ? (
                <div style={styles.connectionList}>
                  <div style={styles.label}>Conexões</div>
                  {selectedNodeEdges.map(edge => (
                    <button
                      key={edge.id}
                      onClick={() => removeEdge(edge.id)}
                      style={styles.connectionButton}
                      type="button"
                    >
                      Remover {edge.source} → {edge.target}
                    </button>
                  ))}
                </div>
              ) : null}
              {connectSourceId ? (
                <div style={styles.hint}>Clique no elemento de destino para conectar.</div>
              ) : (
                <div style={styles.hint}>Arraste elementos no canvas. Use Conectar para criar seta.</div>
              )}
            </>
          ) : (
            <div style={styles.hint}>Selecione um elemento do fluxo.</div>
          )}
          {saveStatus ? <div style={styles.success}>{saveStatus}</div> : null}
          {saveError ? <div style={styles.error}>{saveError}</div> : null}
        </aside>
      </div>
    </div>
  );
}

const styles = {
  body: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'minmax(620px, 1fr) 260px',
    minHeight: 640,
  },
  canvas: {
    backgroundImage: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    minHeight: 640,
    position: 'relative',
  },
  canvasShell: {
    border: '1px solid #D7DEE8',
    borderRadius: 8,
    minHeight: 640,
    overflow: 'auto',
  },
  codeEditor: {
    border: '1px solid #D7DEE8',
    borderRadius: 8,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: '18px',
    minHeight: 180,
    outline: 'none',
    padding: 12,
    resize: 'vertical',
    width: '100%',
  },
  colorGrid: {
    display: 'grid',
    gap: 8,
    gridTemplateColumns: 'repeat(3, 1fr)',
  },
  colorInput: {
    height: 34,
    width: '100%',
  },
  connectionButton: {
    background: '#F8FAFC',
    border: '1px solid #CBD5E1',
    borderRadius: 6,
    color: '#0F172A',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 800,
    padding: '7px 8px',
    textAlign: 'left',
  },
  connectionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  dangerButton: {
    borderColor: '#FCA5A5',
    color: '#B91C1C',
  },
  diamondLabel: {
    display: 'block',
    maxWidth: 90,
    transform: 'rotate(-45deg)',
    whiteSpace: 'pre-line',
    wordBreak: 'break-word',
  },
  diamondNode: {
    height: 118,
    width: 118,
  },
  edges: {
    left: 0,
    pointerEvents: 'auto',
    position: 'absolute',
    top: 0,
  },
  edgeSummary: {
    background: '#F8FAFC',
    border: '1px solid #CBD5E1',
    borderRadius: 6,
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 800,
    lineHeight: '17px',
    padding: 10,
    wordBreak: 'break-word',
  },
  error: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: 800,
  },
  hint: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 700,
    lineHeight: '17px',
  },
  inspector: {
    border: '1px solid #D7DEE8',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 12,
  },
  inspectorTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: 900,
  },
  label: {
    color: '#64748B',
    display: 'flex',
    flexDirection: 'column',
    fontSize: 11,
    fontWeight: 900,
    gap: 5,
  },
  metaInput: {
    border: '1px solid #D7DEE8',
    borderRadius: 8,
    color: '#111827',
    fontSize: 13,
    fontWeight: 700,
    minHeight: 36,
    outline: 'none',
    padding: '8px 10px',
  },
  metaRow: {
    display: 'grid',
    gap: 10,
    gridTemplateColumns: 'minmax(220px, 320px) minmax(280px, 1fr)',
  },
  node: {
    alignItems: 'center',
    border: '1.7px solid #334155',
    borderRadius: 2,
    boxShadow: '0 6px 14px rgba(15, 23, 42, 0.08)',
    cursor: 'grab',
    display: 'flex',
    fontSize: 12,
    fontWeight: 800,
    height: NODE_HEIGHT,
    justifyContent: 'center',
    padding: 8,
    position: 'absolute',
    textAlign: 'center',
    width: NODE_WIDTH,
  },
  nodeLabel: {
    display: 'block',
    maxWidth: '100%',
    whiteSpace: 'pre-line',
    wordBreak: 'break-word',
  },
  nodeTextArea: {
    border: '1px solid #D7DEE8',
    borderRadius: 8,
    color: '#111827',
    fontSize: 12,
    fontWeight: 700,
    minHeight: 86,
    outline: 'none',
    padding: 8,
    resize: 'vertical',
  },
  panel: {
    background: '#FFFFFF',
    border: '1px solid #D7DEE8',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 12,
  },
  saveButton: {
    background: '#0EA5E9',
    border: 0,
    borderRadius: 8,
    color: '#FFFFFF',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 900,
    minHeight: 36,
    padding: '8px 12px',
  },
  select: {
    border: '1px solid #D7DEE8',
    borderRadius: 8,
    color: '#111827',
    fontSize: 12,
    fontWeight: 700,
    minHeight: 36,
    outline: 'none',
    padding: 8,
  },
  success: {
    color: '#0EA5E9',
    fontSize: 12,
    fontWeight: 800,
  },
  toolbar: {
    alignItems: 'center',
    display: 'flex',
    gap: 10,
    justifyContent: 'space-between',
  },
  toolbarGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolButton: {
    background: '#FFFFFF',
    border: '1px solid #0EA5E9',
    borderRadius: 8,
    color: '#0EA5E9',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 900,
    minHeight: 34,
    padding: '7px 10px',
  },
  toolButtonActive: {
    background: 'rgba(14, 165, 233, 0.10)',
  },
};
