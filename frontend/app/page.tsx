"use client"

import { useState, useEffect } from 'react'; 
export default function Home() {
  const [dataGoServer, setDataGoServer] = useState<any>({Port: "", Status: ""}); 
  const [dataPyServer, setDataPyServer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDataGoServer = async () => {
      try {
        const response = await fetch('http://localhost:8080/test');
        const jsonDataGoServer = await response.json();
        console.log(jsonDataGoServer)
        setDataGoServer(jsonDataGoServer);
      } catch (error) {
        console.error('Error fetching dataGoServer:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataGoServer();

    const fetchDataPyServer = async () => {
      try {
        const response2 = await fetch('http://localhost:8000/test');
        const jsonDataPyServer = await response2.json();
        console.log(jsonDataPyServer)
        setDataPyServer(jsonDataPyServer);
      } catch (error) {
        console.error('Error fetching dataGoServer:', error);
      }
    };

    fetchDataPyServer();
  }, []);

  return (
    <>
      {/* {!isLoading && dataGoServer?.Port && (  // Display dataGoServer only if loaded and has `Port` property
        <div>
          Root: Server port is {dataGoServer} and status is {dataGoServer[0].Status}.
        </div>
      )}
      {isLoading && <p>Loading...</p>} Display loading indicator */}

      {JSON.stringify(dataGoServer)}
      {JSON.stringify(dataPyServer)}

    </>
  );
}