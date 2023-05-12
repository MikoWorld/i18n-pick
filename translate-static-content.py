# The files in src/static-content need to be extracted and translated separately as they are markdown files,
# which i18n-pick is unable to pick up. However, seeing as there are only a few long files in static-content,
# translation was performed manually by feeding the texts into ChatGPT. Hence, this script is unused.

import json

# Paths that need to be scanned
# bin/i18n-pick.js scan ../MikoMiko/src/static-content

# ChatGPT prompt
# Translate the sentences in the defaultMessage field to Chinese for me. Return the result in code block:

# Define the paths to the original and translated JSON files
translated_file = "i18n-messages/en-static-content.json"

# Iterate over the source locations in the original JSON file
with open(translated_file) as f:
    translated_data = json.load(f)
    translated_message = translated_data["defaultMessage"]
    source_locations = translated_data["source"]

    for location in source_locations:
        file_path = location["location"]

        with open(file_path, "w") as file:
            file.writelines(translated_message)
