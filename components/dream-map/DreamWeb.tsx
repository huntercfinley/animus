import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import type { Dream, DreamSymbol } from '@/types/database';

interface DreamNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  cluster: string;
  dream: Dream;
}

interface DreamWebProps {
  dreams: Dream[];
  symbols: DreamSymbol[];
}

const SIMULATION_ITERATIONS = 100;

export function DreamWeb({ dreams, symbols }: DreamWebProps) {
  const { width, height } = useWindowDimensions();
  const canvasHeight = height - 250;
  const [nodes, setNodes] = useState<DreamNode[]>([]);

  const clusterMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sym of symbols) {
      if (!map[sym.dream_id] && sym.archetype) {
        map[sym.dream_id] = sym.archetype;
      }
    }
    return map;
  }, [symbols]);

  const clusterCenters = useMemo(() => {
    const uniqueClusters = [...new Set(Object.values(clusterMap))];
    const centers: Record<string, { x: number; y: number }> = {};
    const cx = width / 2;
    const cy = canvasHeight / 2;
    const radius = Math.min(width, canvasHeight) * 0.3;

    uniqueClusters.forEach((cluster, i) => {
      const angle = (2 * Math.PI * i) / uniqueClusters.length - Math.PI / 2;
      centers[cluster] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
    centers['Unknown'] = { x: cx, y: cy };
    return centers;
  }, [clusterMap, width, canvasHeight]);

  // Seed initial positions and run the full force simulation in one pass.
  // The previous version called setNodes on every animation frame, triggering
  // ~100 full SVG re-renders and O(n^2) edge memo recomputes per layout.
  useEffect(() => {
    if (dreams.length === 0) {
      setNodes([]);
      return;
    }

    const next: DreamNode[] = dreams.map((dream) => {
      const cluster = clusterMap[dream.id] || 'Unknown';
      const center = clusterCenters[cluster] || { x: width / 2, y: canvasHeight / 2 };
      const angle = Math.random() * 2 * Math.PI;
      const dist = 20 + Math.random() * 40;
      return {
        id: dream.id,
        x: center.x + dist * Math.cos(angle),
        y: center.y + dist * Math.sin(angle),
        vx: 0,
        vy: 0,
        cluster,
        dream,
      };
    });

    for (let it = 0; it < SIMULATION_ITERATIONS; it++) {
      for (let i = 0; i < next.length; i++) {
        const node = next[i];
        const center = clusterCenters[node.cluster] || { x: width / 2, y: canvasHeight / 2 };

        node.vx += (center.x - node.x) * 0.01;
        node.vy += (center.y - node.y) * 0.01;

        for (let j = 0; j < next.length; j++) {
          if (i === j) continue;
          const dx = node.x - next[j].x;
          const dy = node.y - next[j].y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (d < 40) {
            const force = ((40 - d) / d) * 0.5;
            node.vx += dx * force;
            node.vy += dy * force;
          }
        }

        node.x += node.vx * 0.3;
        node.y += node.vy * 0.3;
        node.vx *= 0.8;
        node.vy *= 0.8;

        node.x = Math.max(20, Math.min(width - 20, node.x));
        node.y = Math.max(20, Math.min(canvasHeight - 20, node.y));
      }
    }

    setNodes(next);
  }, [dreams, clusterMap, clusterCenters, width, canvasHeight]);

  const edges = useMemo(() => {
    const result: { from: DreamNode; to: DreamNode; sameCluster: boolean }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].cluster === nodes[j].cluster && nodes[i].cluster !== 'Unknown') {
          result.push({ from: nodes[i], to: nodes[j], sameCluster: true });
        }
      }
    }
    return result;
  }, [nodes]);

  if (dreams.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Your Dream Web will grow as you record dreams.</Text>
      </View>
    );
  }

  return (
    <View style={{ width, height: canvasHeight }}>
      <Svg width={width} height={canvasHeight}>
        {edges.map((edge, i) => (
          <Line
            key={`e-${i}`}
            x1={edge.from.x}
            y1={edge.from.y}
            x2={edge.to.x}
            y2={edge.to.y}
            stroke={edge.sameCluster ? 'rgba(147, 112, 219, 0.15)' : 'rgba(147, 112, 219, 0.05)'}
            strokeWidth={1}
          />
        ))}

        {Object.entries(clusterCenters).map(([name, pos]) => (
          <SvgText
            key={`cl-${name}`}
            x={pos.x - 20}
            y={pos.y - 50}
            fill={colors.textMuted}
            fontSize={12}
          >
            {name}
          </SvgText>
        ))}

        {nodes.map(node => (
          <G key={node.id} onPress={() => router.push({ pathname: '/dream/[id]', params: { id: node.id } })}>
            <Circle cx={node.x} cy={node.y} r={8} fill="rgba(99, 102, 241, 0.2)" />
            <Circle cx={node.x} cy={node.y} r={4} fill={colors.accent} />
            <Circle cx={node.x} cy={node.y} r={1.5} fill={colors.textPrimary} />
          </G>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});
