import { useState, useEffect } from 'react';

function parseTimeLeft(timeString: string) {
  // Updated regex to make days optional
  const match = timeString?.match(/(?:(\d+)d )?(\d+)h (\d+)m (\d+)s/);
  if (!match) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: match[1] ? parseInt(match[1], 10) : 0, // Handle optional days
    hours: parseInt(match[2], 10),
    minutes: parseInt(match[3], 10),
    seconds: parseInt(match[4], 10),
  };
}

export default function TimeLeft({ timeString }: { timeString: string }) {
  const [timeLeft, setTimeLeft] = useState(parseTimeLeft(timeString));

  useEffect(() => {
    setTimeLeft(parseTimeLeft(timeString));
  }, [timeString]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        if (seconds > 0) seconds--;
        else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
          seconds = 59;
        } else {
          clearInterval(timer);
        }
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col text-white">
      <h2 className="text-base font-bold">Time Left</h2>
      <div className="flex space-x-2 text-lg font-semibold">
        {/* Conditionally render days only if greater than 0 */}
        {timeLeft.days > 0 && (
          <span className="px-2 py-1 bg-gray-700 rounded">{timeLeft.days}d</span>
        )}
        <span className="px-2 py-1 bg-gray-700 rounded">{timeLeft.hours}h</span>
        <span className="px-2 py-1 bg-gray-700 rounded">{timeLeft.minutes}m</span>
        <span className="px-2 py-1 bg-gray-700 rounded">{timeLeft.seconds}s</span>
      </div>
    </div>
  );
}