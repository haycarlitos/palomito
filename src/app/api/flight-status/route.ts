import { NextResponse } from "next/server";
import https from "https";

// Map airline names to IATA codes
const AIRLINE_IATA_MAP: Record<string, string> = {
  aeromexico: "AM",
  volaris: "Y4",
  vivaaerobus: "VB",
  interjet: "IJ",
  american: "AA",
  delta: "DL",
  copa: "CM",
};

interface AeroDataBoxFlight {
  number: string;
  airline?: {
    name: string;
    iata: string;
  };
  departure?: {
    airport: {
      name: string;
      iata: string;
      municipalityName: string;
    };
    scheduledTime?: {
      local: string;
      utc: string;
    };
    terminal?: string;
  };
  arrival?: {
    airport: {
      name: string;
      iata: string;
      municipalityName: string;
    };
    scheduledTime?: {
      local: string;
      utc: string;
    };
    terminal?: string;
  };
  status?: string;
  aircraft?: {
    model: string;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const airline = searchParams.get("airline");
  const flightNumber = searchParams.get("flightNumber");
  const date = searchParams.get("date");
  const departureAirport = searchParams.get("departureAirport");

  // Validate required parameters
  if (!airline || !flightNumber || !date) {
    return NextResponse.json(
      { error: "Missing required parameters: airline, flightNumber, or date" },
      { status: 400 }
    );
  }

  // Get IATA code for airline
  const airlineIata = AIRLINE_IATA_MAP[airline.toLowerCase()];
  if (!airlineIata) {
    return NextResponse.json(
      { error: `Unsupported airline: ${airline}` },
      { status: 400 }
    );
  }

  // Clean flight number (remove spaces, airline code prefix if present)
  const cleanFlightNumber = flightNumber
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^[A-Z]{2}\s*/i, ""); // Remove airline code prefix if present

  // Format date to YYYY-MM-DD
  const formattedDate = date.split("T")[0];

  // Call AeroDataBox API
  const apiKey = process.env.AERODATABOX_API_KEY || "9706c17d6bmsh39dbd53182c7457p10f5f2jsn1d625cd81057";
  
  // Use /flights/number/{flightNumber}/{date} endpoint
  const path = `/flights/number/${airlineIata}${cleanFlightNumber}/${formattedDate}?withAircraftImage=false&withLocation=false&dateLocalRole=Both`;

  try {
    const flightData = await new Promise<AeroDataBoxFlight[]>((resolve, reject) => {
      const options = {
        method: "GET",
        hostname: "aerodatabox.p.rapidapi.com",
        path: path,
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
        },
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          const body = Buffer.concat(chunks).toString();
          
          if (res.statusCode === 404) {
            resolve([]); // Flight not found, return empty array
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`API returned status ${res.statusCode}: ${body}`));
            return;
          }

          try {
            const json = JSON.parse(body);
            resolve(Array.isArray(json) ? json : [json]);
          } catch (e) {
            reject(new Error(`Failed to parse API response: ${body.substring(0, 200)}`));
          }
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });

      req.end();
    });

    // Filter by departure airport if provided
    let flights = flightData;
    if (departureAirport) {
      flights = flightData.filter(
        (flight) =>
          flight.departure?.airport?.iata?.toUpperCase() ===
          departureAirport.toUpperCase()
      );
    }

    // If no flights found
    if (flights.length === 0) {
      return NextResponse.json(
        {
          error: "Flight not found",
          exists: false,
          flightStatus: null,
        },
        { status: 404 }
      );
    }

    // Use first matching flight
    const flight = flights[0];

    // Map status
    const statusMap: Record<string, string> = {
      Expected: "on_time",
      Scheduled: "on_time",
      Delayed: "delayed",
      Cancelled: "cancelled",
      Diverted: "diverted",
      "In Flight": "in_flight",
      Landed: "completed",
    };

    const mappedStatus =
      statusMap[flight.status || ""] || flight.status?.toLowerCase() || "unknown";

    // Format response
    const flightStatus = {
      exists: true,
      airline: flight.airline?.name || airline,
      airlineIata: flight.airline?.iata || airlineIata,
      flightNumber: flight.number || `${airlineIata}${cleanFlightNumber}`,
      date: formattedDate,
      status: mappedStatus,
      rawStatus: flight.status,
      departure: {
        airport: flight.departure?.airport?.name || "Unknown",
        airportIata: flight.departure?.airport?.iata || departureAirport || "",
        city: flight.departure?.airport?.municipalityName || "",
        scheduledTimeLocal:
          flight.departure?.scheduledTime?.local?.split("T")[1]?.substring(0, 5) ||
          null,
        scheduledTimeUtc:
          flight.departure?.scheduledTime?.utc || null,
        terminal: flight.departure?.terminal || null,
      },
      arrival: {
        airport: flight.arrival?.airport?.name || "Unknown",
        airportIata: flight.arrival?.airport?.iata || "",
        city: flight.arrival?.airport?.municipalityName || "",
        scheduledTimeLocal:
          flight.arrival?.scheduledTime?.local?.split("T")[1]?.substring(0, 5) ||
          null,
        scheduledTimeUtc:
          flight.arrival?.scheduledTime?.utc || null,
        terminal: flight.arrival?.terminal || null,
      },
      aircraft: flight.aircraft?.model || null,
    };

    return NextResponse.json({ flightStatus });
  } catch (error) {
    console.error("Error fetching flight data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch flight data",
        message: error instanceof Error ? error.message : "Unknown error",
        exists: false,
      },
      { status: 500 }
    );
  }
}

