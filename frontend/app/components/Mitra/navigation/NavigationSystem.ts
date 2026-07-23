import * as THREE from 'three';
import { TerrainNode, useDOMTerrainStore } from '@/hooks/useDOMTerrain';
import { domTo3D } from '@/utils/domTo3D';
import { JumpNodeGraph } from './JumpNodes';

export class NavigationSystem {
  graph: JumpNodeGraph = new JumpNodeGraph();
  camera: THREE.Camera;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  updateGraphFromDOM() {
    const nodes = useDOMTerrainStore.getState().nodes;
    this.graph = new JumpNodeGraph(); // Reset for simplicity
    
    nodes.forEach(node => {
      // Map to 3D
      const pos = domTo3D(node.rect, this.camera, 0);
      
      // Adjust position based on type to find a "safe zone"
      // e.g., sitting on top edge
      if (node.type === 'message-card-top' || node.type === 'dashboard-panel-edge') {
        // Move pos up slightly to sit ON the border, not inside it
        pos.y += 0.2; // Arbitrary offset
      } else if (node.type === 'input-bar-side') {
        // Sit to the right of the input
        pos.x += 0.5;
      }

      this.graph.addNode({
        id: node.id,
        position: pos,
        connections: [] // Full connectivity can be generated based on distance
      });
    });

    // Auto-connect nodes that are close to each other
    const allNodes = Array.from(this.graph.nodes.values());
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        const a = allNodes[i];
        const b = allNodes[j];
        if (a.position.distanceTo(b.position) < 5.0) { // arbitrary jump range
          this.graph.connect(a.id, b.id);
        }
      }
    }
  }

  getRandomNode(): THREE.Vector3 | null {
    this.updateGraphFromDOM();
    const allNodes = Array.from(this.graph.nodes.values());
    if (allNodes.length === 0) return null;
    
    const randomIdx = Math.floor(Math.random() * allNodes.length);
    return allNodes[randomIdx].position;
  }
}
