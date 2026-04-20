import { NodeType } from '../../types';
import { NODE_DEFAULTS } from '../nodes/nodeDefaults';

const nodeTypes = Object.values(NodeType);

interface Props {
  onAdd: (type: NodeType) => void;
}

export default function NodePalette({ onAdd }: Props) {
  return (
    <div className="node-palette">
      <h3>Add Node</h3>
      {nodeTypes.map((type) => {
        const d = NODE_DEFAULTS[type];
        return (
          <button
            key={type}
            className="palette-item"
            onClick={() => onAdd(type)}
            style={{ borderLeftColor: d.color }}
          >
            <span>{d.icon}</span>
            <span>{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}

