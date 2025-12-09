import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json(); // Array of {name, position, rotation, scale}
    const filePath = path.join(process.cwd(), "data", "data.json");
    const currentData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Update matching items by name
    updates.forEach((update: any) => {
      const item = currentData.find((item: any) => item.name === update.name);
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
