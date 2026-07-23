import re
from .client import VehicleApiClient

# Provided fake vehicles list
MOCK_VEHICLES = [
    {
        "registrationNumber": "TS09AB4567",
        "ownerName": "RAHUL REDDY",
        "fatherName": "SURESH REDDY",
        "dob": "1995-09-18",
        "gender": "M",
        "registrationDate": "2022-03-11",
        "makerModel": "MARUTI SUZUKI INDIA LTD / BALENO",
        "fuelType": "PETROL",
        "color": "PEARL WHITE",
        "vehicleCategory": "LMV",
        "bodyType": "HATCHBACK",
        "manufacturingYear": "2022",
        "seatingCapacity": "5",
        "unladenWeight": "935",
        "chassisNumber": "MA3EJKL12AB987654",
        "engineNumber": "K15BN7654321",
        "currentAddress": "12-5-87, Road No. 3, Kukatpally, Hyderabad - 500072",
        "insuranceCompany": "ICICI Lombard General Insurance",
        "insurancePolicyNumber": "ICICI-TS09AB4567-2026",
        "insuranceValidity": "2027-03-10",
        "puccValidity": "2026-12-31",
        "fitnessValidity": "2037-03-10",
        "taxPaidUpTo": "2037-03-10",
        "isFinanced": "YES",
        "financierName": "State Bank of India"
    },
    {
        "registrationNumber": "AP39CD7821",
        "ownerName": "PRIYA SHARMA",
        "fatherName": "ASHOK SHARMA",
        "dob": "1992-01-25",
        "gender": "F",
        "registrationDate": "2021-08-18",
        "makerModel": "HYUNDAI MOTOR INDIA LTD / CRETA",
        "fuelType": "DIESEL",
        "color": "BLACK",
        "vehicleCategory": "LMV",
        "bodyType": "SUV",
        "manufacturingYear": "2021",
        "seatingCapacity": "5",
        "unladenWeight": "1370",
        "chassisNumber": "MALFC81ABCD123456",
        "engineNumber": "D15CR987654",
        "currentAddress": "MVP Colony, Visakhapatnam, Andhra Pradesh - 530017",
        "insuranceCompany": "HDFC ERGO",
        "insurancePolicyNumber": "HDFC-782145",
        "insuranceValidity": "2027-08-17",
        "puccValidity": "2026-10-20",
        "fitnessValidity": "2036-08-17",
        "taxPaidUpTo": "2036-08-17",
        "isFinanced": "YES",
        "financierName": "HDFC BANK LTD"
    },
    {
        "registrationNumber": "KA03MN9988",
        "ownerName": "VIKRAM NAIK",
        "fatherName": "GOPAL NAIK",
        "dob": "1987-06-09",
        "gender": "M",
        "registrationDate": "2020-11-02",
        "makerModel": "TATA MOTORS LTD / NEXON",
        "fuelType": "PETROL",
        "color": "BLUE",
        "vehicleCategory": "LMV",
        "bodyType": "SUV",
        "manufacturingYear": "2020",
        "seatingCapacity": "5",
        "unladenWeight": "1250",
        "chassisNumber": "MAT612345XYZ98765",
        "engineNumber": "REVTRON654321",
        "currentAddress": "HSR Layout, Bengaluru, Karnataka - 560102",
        "insuranceCompany": "Bajaj Allianz",
        "insurancePolicyNumber": "BAJAJ-998877",
        "insuranceValidity": "2027-01-15",
        "puccValidity": "2026-09-30",
        "fitnessValidity": "2035-11-01",
        "taxPaidUpTo": "2035-11-01",
        "isFinanced": "NO",
        "financierName": ""
    },
    {
        "registrationNumber": "TN10PQ2211",
        "ownerName": "SANTHOSH KUMAR",
        "fatherName": "MURUGAN",
        "dob": "1990-04-14",
        "gender": "M",
        "registrationDate": "2019-07-26",
        "makerModel": "TOYOTA KIRLOSKAR / INNOVA CRYSTA",
        "fuelType": "DIESEL",
        "color": "WHITE",
        "vehicleCategory": "LMV",
        "bodyType": "MUV",
        "manufacturingYear": "2019",
        "seatingCapacity": "7",
        "unladenWeight": "1785",
        "chassisNumber": "MBJGH12345TY78901",
        "engineNumber": "GD987654321",
        "currentAddress": "Anna Nagar, Chennai, Tamil Nadu - 600040",
        "insuranceCompany": "New India Assurance",
        "insurancePolicyNumber": "NIA-445566",
        "insuranceValidity": "2027-06-15",
        "puccValidity": "2026-12-05",
        "fitnessValidity": "2034-07-25",
        "taxPaidUpTo": "2034-07-25",
        "isFinanced": "YES",
        "financierName": "Axis Bank"
    },
    {
        "registrationNumber": "MH12ZX6543",
        "ownerName": "ANJALI DESHMUKH",
        "fatherName": "PRADEEP DESHMUKH",
        "dob": "1998-12-03",
        "gender": "F",
        "registrationDate": "2023-01-12",
        "makerModel": "MAHINDRA & MAHINDRA / XUV700",
        "fuelType": "PETROL",
        "color": "RED",
        "vehicleCategory": "LMV",
        "bodyType": "SUV",
        "manufacturingYear": "2023",
        "seatingCapacity": "7",
        "unladenWeight": "1755",
        "chassisNumber": "MA1XUV700ABC98765",
        "engineNumber": "TGDI123987",
        "currentAddress": "Baner, Pune, Maharashtra - 411045",
        "insuranceCompany": "TATA AIG",
        "insurancePolicyNumber": "TATAAIG-654321",
        "insuranceValidity": "2028-01-11",
        "puccValidity": "2027-01-11",
        "fitnessValidity": "2038-01-11",
        "taxPaidUpTo": "2038-01-11",
        "isFinanced": "YES",
        "financierName": "ICICI Bank"
    },
    # Additional mappings matching existing mock registrations to enable seamless compatibility with ScanScreen and ManualScreen
    {
        "registrationNumber": "MH02CL0555",
        "ownerName": "PRIYA SHARMA",
        "fatherName": "ASHOK SHARMA",
        "dob": "1992-01-25",
        "gender": "F",
        "registrationDate": "2012-04-15",
        "makerModel": "BMW / 740LI",
        "fuelType": "PETROL",
        "color": "BLACK",
        "vehicleCategory": "LMV",
        "bodyType": "SEDAN",
        "manufacturingYear": "2012",
        "seatingCapacity": "5",
        "unladenWeight": "1910",
        "chassisNumber": "WBAFR7C57CC811956",
        "engineNumber": "N54B30A",
        "currentAddress": "MVP Colony, Visakhapatnam, Andhra Pradesh - 530017",
        "insuranceCompany": "TATA AIG",
        "insurancePolicyNumber": "TATAAIG-88339",
        "insuranceValidity": "2027-04-14",
        "puccValidity": "2026-10-14",
        "fitnessValidity": "2027-04-14",
        "taxPaidUpTo": "2027-04-14",
        "isFinanced": "NO",
        "financierName": ""
    },
    {
        "registrationNumber": "TE57VRN",
        "ownerName": "JOHN SMITH",
        "fatherName": "ROBERT SMITH",
        "dob": "1980-05-12",
        "gender": "M",
        "registrationDate": "2024-01-10",
        "makerModel": "TOYOTA / CAMRY",
        "fuelType": "HYBRID",
        "color": "SILVER",
        "vehicleCategory": "LMV",
        "bodyType": "SEDAN",
        "manufacturingYear": "2024",
        "seatingCapacity": "5",
        "unladenWeight": "1580",
        "chassisNumber": "4T1BF1FKXRU123456",
        "engineNumber": "A25AFKS987",
        "currentAddress": "10 Downing St, London, UK - SW1A 2AA",
        "insuranceCompany": "Aviva Insurance",
        "insurancePolicyNumber": "AVIVA-776655",
        "insuranceValidity": "2028-01-09",
        "puccValidity": "2027-01-09",
        "fitnessValidity": "2039-01-09",
        "taxPaidUpTo": "2039-01-09",
        "isFinanced": "NO",
        "financierName": ""
    },
    {
        "registrationNumber": "7XER187",
        "ownerName": "JANE DOE",
        "fatherName": "JOHN DOE SR",
        "dob": "1985-11-20",
        "gender": "F",
        "registrationDate": "2024-02-15",
        "makerModel": "TOYOTA / CAMRY",
        "fuelType": "HYBRID",
        "color": "GREY",
        "vehicleCategory": "LMV",
        "bodyType": "SEDAN",
        "manufacturingYear": "2024",
        "seatingCapacity": "5",
        "unladenWeight": "1580",
        "chassisNumber": "4T1BF1FKXRU987654",
        "engineNumber": "A25AFKS112",
        "currentAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043",
        "insuranceCompany": "State Farm",
        "insurancePolicyNumber": "SF-998877",
        "insuranceValidity": "2027-02-14",
        "puccValidity": "2026-08-14",
        "fitnessValidity": "2039-02-14",
        "taxPaidUpTo": "2039-02-14",
        "isFinanced": "NO",
        "financierName": ""
    }
]

class FakeVehicleApiClient(VehicleApiClient):
    """
    TEMPORARY Mock API Client representing the Government Registry (API Setu) lookup.
    Easy to replace later when swapping in the real client.
    """
    def lookup_registration(self, registration_number: str) -> dict:
        # Validate/normalize registration format
        if not registration_number or not registration_number.strip():
            raise ValueError("Registration number cannot be empty")
            
        normalized = registration_number.strip().replace(" ", "").upper()
        
        # Check basic alphanumeric pattern (allow hyphens in validation but normalize them out)
        clean_format = normalized.replace("-", "")
        if not clean_format.isalnum():
            raise ValueError("Invalid registration number: must be alphanumeric")
            
        # Simulate API failures for test scenarios
        if clean_format == "APIFAIL":
            raise Exception("Simulated connection timeout from government API Setu server")
            
        # Simulate a vehicle that exists in registry but has no matching safety entry in vehicles.json
        if clean_format == "NOTFOUNDPLATE":
            return {
                "registrationNumber": "NOTFOUNDPLATE",
                "ownerName": "TEST ACCOUNT",
                "fatherName": "TEST PARENT",
                "dob": "1990-01-01",
                "gender": "M",
                "registrationDate": "2025-01-01",
                "makerModel": "TESLA / MODEL 3",
                "fuelType": "ELECTRIC",
                "color": "WHITE",
                "vehicleCategory": "SPACESHIP",
                "bodyType": "ROCKET",
                "manufacturingYear": "2025",
                "seatingCapacity": "5",
                "unladenWeight": "1600",
                "chassisNumber": "5YJ3E1EA8KF123456",
                "engineNumber": "3D1123456",
                "currentAddress": "1 Infinite Loop, Cupertino, CA 95014",
                "insuranceCompany": "Geico",
                "insurancePolicyNumber": "GEICO-12345",
                "insuranceValidity": "2028-01-01",
                "puccValidity": "2027-01-01",
                "fitnessValidity": "2040-01-01",
                "taxPaidUpTo": "2040-01-01",
                "isFinanced": "NO",
                "financierName": ""
            }

        # Search the mock registry
        for vehicle in MOCK_VEHICLES:
            if vehicle["registrationNumber"].strip().replace(" ", "").upper().replace("-", "") == clean_format:
                return vehicle
                
        # Raise KeyError if not found (simulates API 404)
        raise KeyError(f"Registration number '{registration_number}' not found in government database")
