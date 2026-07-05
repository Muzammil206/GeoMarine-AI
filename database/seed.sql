-- Nigeria Maritime Intelligence Platform
-- Port Boundary Seed Data
-- Approximate rectangular polygons (~3-5km) around each port

INSERT INTO ports (name, state, description, geom) VALUES
(
    'Apapa Port',
    'Lagos',
    'Largest and busiest port in Nigeria, located in Lagos. Handles containerized and general cargo.',
    ST_GeomFromText('POLYGON((
        3.3750 6.4350,
        3.4050 6.4350,
        3.4050 6.4650,
        3.3750 6.4650,
        3.3750 6.4350
    ))', 4326)
),
(
    'Tin Can Island Port',
    'Lagos',
    'Second major port in Lagos, handles containers, vehicles, dry and liquid bulk cargo.',
    ST_GeomFromText('POLYGON((
        3.3250 6.4150,
        3.3600 6.4150,
        3.3600 6.4500,
        3.3250 6.4500,
        3.3250 6.4150
    ))', 4326)
),
(
    'Onne Port',
    'Rivers',
    'Federal Ocean Terminal and Federal Lighter Terminal. Major oil and gas logistics hub.',
    ST_GeomFromText('POLYGON((
        7.1350 4.6650,
        7.1800 4.6650,
        7.1800 4.7050,
        7.1350 4.7050,
        7.1350 4.6650
    ))', 4326)
),
(
    'Calabar Port',
    'Cross River',
    'Located on the Calabar River, handles general cargo and some containerized freight.',
    ST_GeomFromText('POLYGON((
        8.3000 4.9550,
        8.3430 4.9550,
        8.3430 4.9980,
        8.3000 4.9980,
        8.3000 4.9550
    ))', 4326)
),
(
    'Warri Port',
    'Delta',
    'Also known as Delta Port Complex. Located on the Warri River, handles general and bulk cargo.',
    ST_GeomFromText('POLYGON((
        5.7300 5.4950,
        5.7700 5.4950,
        5.7700 5.5400,
        5.7300 5.5400,
        5.7300 5.4950
    ))', 4326)
),
(
    'Port Harcourt Port',
    'Rivers',
    'Located on the Bonny River. Handles general cargo, containers, and petroleum products.',
    ST_GeomFromText('POLYGON((
        6.9900 4.7550,
        7.0370 4.7550,
        7.0370 4.8000,
        6.9900 4.8000,
        6.9900 4.7550
    ))', 4326)
)
ON CONFLICT (name) DO UPDATE SET
    geom = EXCLUDED.geom,
    state = EXCLUDED.state,
    description = EXCLUDED.description;

-- Verify
SELECT id, name, state, ST_AsText(geom) AS boundary, ST_Area(geom::geography) / 1000000 AS area_km2
FROM ports
ORDER BY id;
