import * as THREE from 'three';

export interface JumpNode {
  id: string;
  position: THREE.Vector3;
  connections: string[]; // IDs of connected nodes
}

export class JumpNodeGraph {
  nodes: Map<string, JumpNode> = new Map();

  addNode(node: JumpNode) {
    this.nodes.set(node.id, node);
  }

  connect(idA: string, idB: string) {
    const a = this.nodes.get(idA);
    const b = this.nodes.get(idB);
    if (a && b) {
      if (!a.connections.includes(idB)) a.connections.push(idB);
      if (!b.connections.includes(idA)) b.connections.push(idA);
    }
  }

  // A simple A* or just nearest neighbor could be implemented here for pathfinding
  getNearestNode(position: THREE.Vector3): JumpNode | null {
    let nearest: JumpNode | null = null;
    let minDistance = Infinity;

    this.nodes.forEach((node) => {
      const dist = position.distanceToSquared(node.position);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = node;
      }
    });

    return nearest;
  }
}
