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
  [pdfName: string]: {
    time: number;
  };
}

interface SinglePDFWatchTimeProps {
  interactions: SessionActivity[];
}

const SinglePDFWatchTimeComponent: React.FC<SinglePDFWatchTimeProps> = ({
  interactions,
}) => {
  // const [pdfWatchingTimes, setPdfWatchingTimes] = useState<PDFWatchingTimes>(
  //   {}
  // );
  const [chartData, setChartData] = useState<
    { pdfName: string; time: number }[]
  >([]);

  useEffect(() => {
    const calculateSinglePDFWatchingTimes = () => {
      const watchingTimes: PDFWatchingTimes = {};

      interactions.forEach((interaction) => {
        const { pdfActions } = interaction;

        // Combine all actions for the current session
        // const allActions = [...pdfActions, ...otherActions, ...chatActions];

        let currentPDFID: string | null = null;
        let currentFirstTime: Date | null = null;
        let lastActionTime: Date | null = null;
        // let totalTime = 0;

        // Iterate through all actions and calculate watch times for each pdfID
        pdfActions.forEach((action) => {
          if (
            action.type === "frontend-interaction-pdf-change" &&
            action.context?.pdfID
          ) {
            const pdfID = action.pdfId;

            if (currentPDFID === null) {
              // First action for this pdfID
              currentPDFID = pdfID;
              currentFirstTime = new Date(action.timestamp);
            } else if (currentPDFID !== pdfID) {
              // Switched to a different pdfID, finalize the current pdfID watch time
              lastActionTime = new Date(action.timestamp);
              const watchingTime = calculateWatchingTime(
                currentFirstTime as Date,
                lastActionTime
              );
              if (watchingTimes[currentPDFID]) {
                watchingTimes[currentPDFID].time += watchingTime;
              } else {
                watchingTimes[currentPDFID] = { time: watchingTime };
              }

              // Reset for the new pdfID
              currentPDFID = pdfID;
              currentFirstTime = new Date(action.timestamp);
              // totalTime = 0;
            }

            // Update last action time for the current pdfID
            lastActionTime = new Date(action.timestamp);
          }
        });

        // Finalize the last pdfID if there are any remaining actions
        if (currentPDFID && currentFirstTime && lastActionTime) {
          const watchingTime = calculateWatchingTime(
            currentFirstTime,
            lastActionTime
          );
          if (watchingTimes[currentPDFID]) {
            watchingTimes[currentPDFID].time += watchingTime;
          } else {
            watchingTimes[currentPDFID] = { time: watchingTime };
          }
        }
      });

      // Convert watchingTimes object to array for chart data
      const chartDataArray = Object.entries(watchingTimes).map(
        ([pdfName, data]) => ({ pdfName, time: data.time })
      );
      // Sort chart data by time in descending order
      chartDataArray.sort((a, b) => b.time - a.time);

      // setPdfWatchingTimes(watchingTimes);
      setChartData(chartDataArray);
    };

    const calculateWatchingTime = (startTime: Date, endTime: Date): number => {
      return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // Convert to minutes
    };

    calculateSinglePDFWatchingTimes();
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
          Single PDF Watching Time (hour, pdf number: {chartData.length})
        </span>
      </div>
      <BarChart
        width={500}
        height={300}
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="pdfName" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="time" fill="#8884d8" />
      </BarChart>
    </div>
  );
};

export default SinglePDFWatchTimeComponent;
