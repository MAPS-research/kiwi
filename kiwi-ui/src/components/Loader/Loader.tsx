import React, { useState, useEffect } from "react";
import "./loader.css"; // Import the CSS file for styling

const Loader: React.FC = () => {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((dots) => (dots.length < 3 ? dots + "." : "."));
    }, 500); // Change the dot number every 500 milliseconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loader" data-dots>
      Thinking{dots}
    </div>
  );
};

export default Loader;
