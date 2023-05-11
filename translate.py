import json

# Define the paths to the original and translated JSON files
translated_file = "i18n-messages/zh-CH-translated.json"

# Read the translated defaultMessage from the translated JSON file
with open(translated_file) as f:
    translated_data = json.load(f)
    translated_message = translated_data["defaultMessage"]

# Iterate over the source locations in the original JSON file
with open(translated_file) as f:
    translated_data = json.load(f)
    idx = translated_data["id"]
    source_locations = translated_data["source"]

    for location in source_locations:
        file_path = location["location"].split("#")[0]
        line_number = int(location["location"].split("#")[1])
        char_number = int(location["location"].split("#")[2])

        # Replace the words in the specified location with the translated message
        with open(file_path, "r") as file:
            lines = file.readlines()

        line = lines[line_number - 1]
        line = line.replace(idx, translated_message)
        lines[line_number - 1] = line

        with open(file_path, "w") as file:
            file.writelines(lines)
