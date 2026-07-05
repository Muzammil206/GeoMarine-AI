"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface VesselCountChartProps {
  data?: Array<{ date: string; vessel_count: number; port_name?: string }>;
  height?: number;
  title?: string;
}

const DEMO_DATA = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toISOString().split("T")[0],
    vessel_count: Math.floor(40 + Math.random() * 50),
  };
});

export default function VesselCountChart({
  data = DEMO_DATA,
  height = 320,
  title = "Daily Vessel Detections",
}: VesselCountChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, undefined, {
        renderer: "canvas",
      });
    }

    const dates = data.map((d) => d.date);
    const values = data.map((d) => d.vessel_count);

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
        backgroundColor: "rgba(250, 249, 246, 0.95)",
        borderColor: "rgba(20, 18, 16, 0.1)",
        textStyle: { color: "#141210", fontSize: 12, fontFamily: "Inter" },
        axisPointer: {
          type: "line",
          lineStyle: { color: "rgba(27, 94, 59, 0.3)" },
        },
        formatter: (params: echarts.DefaultLabelFormatterCallbackParams[]) => {
          const p = params[0];
          return `<div style="font-weight:600">${p.name}</div>
                  <div style="color:#1b5e3b;margin-top:4px;font-weight:600">${p.value} vessels</div>`;
        },
      },
      grid: {
        left: 50,
        right: 20,
        top: 50,
        bottom: 30,
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLine: { lineStyle: { color: "rgba(20, 18, 16, 0.08)" } },
        axisLabel: {
          color: "#7a746d",
          fontSize: 10,
          fontFamily: "Inter",
          formatter: (val: string) => {
            const d = new Date(val);
            return `${d.getDate()}/${d.getMonth() + 1}`;
          },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisLabel: { color: "#7a746d", fontSize: 10, fontFamily: "Inter" },
        splitLine: { lineStyle: { color: "rgba(20, 18, 16, 0.06)" } },
      },
      series: [
        {
          type: "line",
          data: values,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          showSymbol: false,
          lineStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: "#1b5e3b" },
              { offset: 1, color: "#2a7a50" },
            ]),
            width: 2.5,
          },
          itemStyle: {
            color: "#1b5e3b",
            borderColor: "#faf9f6",
            borderWidth: 2,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(27, 94, 59, 0.15)" },
              { offset: 1, color: "rgba(27, 94, 59, 0)" },
            ]),
          },
          emphasis: {
            showSymbol: true,
            itemStyle: {
              color: "#1b5e3b",
              borderColor: "#fff",
              borderWidth: 2,
              shadowColor: "rgba(27, 94, 59, 0.4)",
              shadowBlur: 10,
            },
          },
        },
      ],
    });

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, title]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  return <div ref={chartRef} style={{ width: "100%", height }} />;
}
