import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { Data } from "../../(exhibition)/page";

export async function POST(request: NextRequest) {
  try {
    const updates: Data[] = await request.json();
    for (const update of updates) {
      const existing = await axios.get(
        `${process.env.NEXT_PUBLIC_MOCK_API}/events?name=${update.name}`
      );
      if (existing.data.length > 0) {
        const id = existing.data[0].id;
        await axios.put(
          `${process.env.NEXT_PUBLIC_MOCK_API}/events/${id}`,
          update
        );
      }
    }
    return NextResponse.json({ message: "Data updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update data" },
      { status: 500 }
    );
  }
}
