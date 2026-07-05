"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface PortComparisonChartProps {
  data?: Array<{ name: string; count: number }>;
  height?: number;
  title?: string;
}

const DEMO_DATA = [
  { name: "Apapa", count: 1204 },
  { name: "Tin Can", count: 687 },
  { name: "Onne", count: 423 },
  { name: "Calabar", count: 198 },
  { name: "Warri", count: 187 },
  { name: "PH", count: 148 },
];

const BAR_COLORS = ["#1b5e3b", "#2a7a50", "#2563eb", "#d97706", "#b45309", "#dc2626"];

export default function PortComparisonChart({
  data = DEMO_DATA,
  height = 320,
  title = "Port Activity Ranking",
}: PortComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const sorted = [...data].sort((a, b) => a.count - b.count);

    chartInstance.current.setOption({
      backgroundColor: "transparent",
      title: {
        text: title,
        textStyle: {
          color: "#141210",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "Inter",
        },
        left: 0,
        top: 0,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(250, 249, 246, 0.95)",
        borderColor: "rgba(20, 18, 16, 0.1)",
        textStyle: { color: "#141210", fontSize: 12, fontFamily: "Inter" },
      },
      grid: {
        left: 110,
        right: 30,
        top: 50,
        bottom: 20,
      },
      xAxis: {
        type: "value",
        axisLine: { show: false },
        axisLabel: { color: "#7a746d", fontSize: 10, fontFamily: "Inter" },
        splitLine: { lineStyle: { color: "rgba(20, 18, 16, 0.06)" } },
      },
      yAxis: {
        type: "category",
        data: sorted.map((d) => d.name),
        axisLine: { lineStyle: { color: "rgba(20, 18, 16, 0.08)" } },
        axisLabel: {
          color: "#4a4540",
          fontSize: 12,
          fontFamily: "Inter",
          fontWeight: 500,
        },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          data: sorted.map((d, i) => ({
            value: d.count,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: BAR_COLORS[i % BAR_COLORS.length] + "20" },
                { offset: 1, color: BAR_COLORS[i % BAR_COLORS.length] },
              ]),
              borderRadius: [0, 6, 6, 0],
            },
          })),
          barWidth: 20,
          label: {
            show: true,
            position: "right",
            color: "#4a4540",
            fontSize: 11,
            fontFamily: "Inter",
            fontWeight: 600,
            formatter: "{c}",
          },
        },
      ],
    });

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data, title]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
}
