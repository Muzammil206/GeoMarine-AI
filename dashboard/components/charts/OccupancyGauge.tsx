"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface OccupancyGaugeProps {
  value: number;
  max?: number;
  label?: string;
  size?: number;
}

export default function OccupancyGauge({
  value,
  max = 50,
  label = "Current Vessels",
  size = 180,
}: OccupancyGaugeProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const pct = Math.min(value / max, 1);
    const color =
      pct > 0.8 ? "#dc2626" : pct > 0.5 ? "#d97706" : "#1b5e3b";

    chartInstance.current.setOption({
      backgroundColor: "transparent",
      series: [
        {
          type: "gauge",
          startAngle: 220,
          endAngle: -40,
          min: 0,
          max,
          radius: "90%",
          progress: {
            show: true,
            width: 14,
            roundCap: true,
            itemStyle: { color },
          },
          pointer: { show: false },
          axisLine: {
            lineStyle: {
              width: 14,
              color: [[1, "rgba(20, 18, 16, 0.08)"]],
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: {
            show: true,
            offsetCenter: [0, "65%"],
            textStyle: {
              fontSize: 11,
              color: "#7a746d",
              fontFamily: "Inter",
              fontWeight: 500,
            },
          },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, "20%"],
            formatter: "{value}",
            textStyle: {
              fontSize: 32,
              fontWeight: 700,
              color: "#141210",
              fontFamily: "Inter",
            },
          },
          data: [{ value, name: label }],
        },
      ],
    });

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [value, max, label]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  return <div ref={chartRef} style={{ width: size, height: size }} />;
}
