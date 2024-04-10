"use client"

import { useState, useEffect } from 'react'; 
export default function Home() {
  const [dataGoServer, setDataGoServer] = useState<any>([{Port: "", Status: ""}]); 
  const [dataPyServer, setDataPyServer] = useState<any>({Port: "", Status: ""});
  const [dataServer, setDataServer] = useState<any>({Port: "", Status: ""}); 

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

     const fetchDataServer = async () => {
      try {
        const response3 = await fetch('http://localhost:8000/test');
        const jsonDataServer = await response3.json();
        console.log(jsonDataServer)
        setDataServer(jsonDataServer);
      } catch (error) {
        console.error('Error fetching dataGoServer:', error);
      }
    };

    fetchDataServer();
  }, []);

  return (
    <>
      {/* {!isLoading && dataGoServer?.Port && (  // Display dataGoServer only if loaded and has `Port` property
        <div>
          Root: Server port is {dataGoServer} and status is {dataGoServer[0].Status}.
        </div>
      )}
      {isLoading && <p>Loading...</p>} Display loading indicator */}

      {JSON.stringify(dataGoServer[0])}
      <br/>
      {JSON.stringify(dataPyServer)}
      <br/>
      {JSON.stringify(dataServer)}
    </>
  );
}