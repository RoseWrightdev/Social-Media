import { NextApiRequest, NextApiResponse } from "next";
import { ROUTE_SERVER_PATH } from "@/app/utils/routeConstants";

export default async function goServerTestHandler(req: NextApiRequest, res: NextApiResponse) {
    const url = ROUTE_SERVER_PATH;
    try {
      const response = await fetch(url);

      if(!response.ok){
        throw new Error(`Error fetching data from ${ROUTE_SERVER_PATH}. response.status = ${response.status}`)
      }
      
      const JSON_DATA = response.json();

      res.status(200).json(JSON_DATA);
      return JSON_DATA;
    } catch (error){
      res.status(500).json({ message: 'Failed to fetch data from ' + ROUTE_SERVER_PATH });
    }
}