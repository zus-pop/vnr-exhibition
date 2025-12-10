import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Data } from "../../(exhibition)/page";

export async function POST(request: NextRequest) {
  try {
    const updates: Data[] = await request.json(); // Array of {name, position, rotation, scale}
    const filePath = path.join(process.cwd(), "data", "data.json");
    const currentData: Data[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Update matching items by name
    updates.forEach((update) => {
      const item = currentData.find((item) => item.name === update.name);
      if (item) {
        item.position = update.position;
        item.rotation = update.rotation;
        item.scale = update.scale;
      }
    });

    fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));
    return NextResponse.json({ message: "Data updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update data" },
      { status: 500 }
    );
  }
}
