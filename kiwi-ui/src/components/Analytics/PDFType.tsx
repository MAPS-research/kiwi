import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { SessionActivity } from "./interface.tsx";

interface PDFWatchingTimes {
  [pdfMaterialType: string]: {
    time: number;
  };
}

interface PDFMaterialTypeWatchTimeProps {
  interactions: SessionActivity[];
}

const PDFMaterialTypeWatchTimeComponent: React.FC<
  PDFMaterialTypeWatchTimeProps
> = ({ interactions }) => {
  // const [pdfWatchingTimes, setPdfWatchingTimes] = useState<PDFWatchingTimes>({});
  const [chartData, setChartData] = useState<
    { pdfMaterialType: string; time: number }[]
  >([]);

  useEffect(() => {
    const calculatePDFMaterialTypeWatchTimes = () => {
      const watchingTimes: PDFWatchingTimes = {};

      interactions.forEach((interaction) => {
        const { pdfActions } = interaction;

        // Combine all actions for the current session
        // const allActions = [...pdfActions, ...otherActions, ...chatActions];

        let currentMaterialType: string | null = null;
        let currentFirstTime: Date | null = null;
        let lastActionTime: Date | null = null;
        // let totalTime = 0;

        // Iterate through all actions and calculate watch times for each pdfMaterialType
        pdfActions.forEach((action) => {
          if (action.context?.pdfMaterialType) {
            const materialType = action.pdfMaterialType;

            if (currentMaterialType === null) {
              // First action for this pdfMaterialType
              currentMaterialType = materialType;
              currentFirstTime = new Date(action.timestamp);
            } else if (currentMaterialType !== materialType) {
              // Switched to a different pdfMaterialType, finalize the current pdfMaterialType watch time
              lastActionTime = new Date(action.timestamp);
              const watchingTime = calculateWatchingTime(
                currentFirstTime as Date,
                lastActionTime
              );
              if (watchingTimes[currentMaterialType]) {
                watchingTimes[currentMaterialType].time += watchingTime;
              } else {
                watchingTimes[currentMaterialType] = { time: watchingTime };
              }

              // Reset for the new pdfMaterialType
              currentMaterialType = materialType;
              currentFirstTime = new Date(action.timestamp);
              // totalTime = 0;
            }

            // Update last action time for the current pdfMaterialType
            lastActionTime = new Date(action.timestamp);
          }
        });

        // Finalize the last pdfMaterialType if there are any remaining actions
        if (currentMaterialType && currentFirstTime && lastActionTime) {
          const watchingTime = calculateWatchingTime(
            currentFirstTime,
            lastActionTime
          );
          if (watchingTimes[currentMaterialType]) {
            watchingTimes[currentMaterialType].time += watchingTime;
          } else {
            watchingTimes[currentMaterialType] = { time: watchingTime };
          }
        }
      });

      // Convert watchingTimes object to array for chart data
      const chartDataArray = Object.entries(watchingTimes).map(
        ([pdfMaterialType, data]) => ({ pdfMaterialType, time: data.time })
      );
      // Sort chart data by time in descending order
      chartDataArray.sort((a, b) => b.time - a.time);

      // setPdfWatchingTimes(watchingTimes);
      setChartData(chartDataArray);
    };

    const calculateWatchingTime = (startTime: Date, endTime: Date): number => {
      return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // Convert to minutes
    };

    calculatePDFMaterialTypeWatchTimes();
  }, [interactions]);

  // const parseTimestamp = (timestamp: string | number): Date => {
  //   if (typeof timestamp === "number" || /^\d+$/.test(timestamp)) {
  //     // If it's a Unix timestamp in milliseconds or a string of digits
  //     return new Date(Number(timestamp));
  //   } else if (typeof timestamp === "string") {
  //     // If it's an ISO 8601 date string
  //     return new Date(timestamp);
  //   } else {
  //     throw new Error("Unsupported timestamp format");
  //   }
  // };

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: "bold" }}>
          PDF Material Type Watching Time(hour)
        </span>
      </div>
      <BarChart
        width={500}
        height={300}
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="pdfMaterialType" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="time" fill="#82ca9d" />
      </BarChart>
    </div>
  );
};

export default PDFMaterialTypeWatchTimeComponent;