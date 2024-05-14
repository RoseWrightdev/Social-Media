import { SERVER_PATH } from "@/lib/constants";

export default async function GET_UserById(id: string) {
  const req = await fetch(SERVER_PATH + "/user/" + id, { cache: "no-store" });

  if (!req.ok) {
    throw new Error("Failed to fetch data");
  }

  const res = await req.json();
  return res;
}