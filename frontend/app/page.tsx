"use client"

import { useState, useEffect } from 'react'; // Import for handling asynchronous data fetching

export default function Home() {
  const [data, setData] = useState<any>({Port: "", Status: ""}); // Initialize data state
  const [isLoading, setIsLoading] = useState(false); // State for loading indicator

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // Set loading state to true
      try {
        const response = await fetch('http://localhost:8080/test'); // Corrected URL format
        const jsonData = await response.json();
        console.log(jsonData)
        setData(jsonData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false); // Set loading state to false
      }
    };

    fetchData();

  }, []); // Empty dependency array to fetch data only once on component mount

 

  return (
    <>
      {/* {!isLoading && data?.Port && (  // Display data only if loaded and has `Port` property
        <div>
          Root: Server port is {data} and status is {data[0].Status}.
        </div>
      )}
      {isLoading && <p>Loading...</p>} Display loading indicator */}

      {JSON.stringify(data)}
    </>
  );
}