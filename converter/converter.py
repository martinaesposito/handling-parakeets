import csv
import json

def convert_csv_file_to_json(csv_filepath, output_filepath=None):
    """
    Convert a CSV file to JSON with debugging information.
    """
    result = []
    
    try:
        with open(csv_filepath, 'r', encoding='utf-8') as csvfile:
            # Print the first few lines of the file to see what we're working with
            print("First few lines of the file:")
            content = csvfile.read()
            lines = content.split('\n')
            for i, line in enumerate(lines[:3]):
                print(f"Line {i}: {line}")
            
            # Reset file pointer to beginning
            csvfile.seek(0)
            
            # Create the reader with comma delimiter
            reader = csv.DictReader(csvfile)  # Default delimiter is comma
            print("\nColumn names from DictReader:", reader.fieldnames)
            
            # Process each row
            for i, row in enumerate(reader):
                print(f"\nProcessing row {i}:")
                print("Raw row data:", dict(row))
                
                # Clean up each value and handle empty strings
                entry = {}
                for col in reader.fieldnames:
                    value = row.get(col, '').strip()
                    # Handle quoted values that might contain commas
                    if value.startswith('"') and value.endswith('"'):
                        value = value[1:-1]
                    entry[col] = value if value else None
                result.append(entry)
                print("Processed entry:", entry)
        
        # Save to file if output path is specified
        if output_filepath:
            with open(output_filepath, 'w', encoding='utf-8') as jsonfile:
                json.dump(result, jsonfile, indent=2, ensure_ascii=False)
            print(f"\nJSON file saved to: {output_filepath}")
            
        return result
        
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(traceback.format_exc())
        return None

if __name__ == "__main__":
    input_csv = "listings.csv"  # Replace with your file path
    output_json = "listings.json"
    
    data = convert_csv_file_to_json(input_csv, output_json)
