import json

# Steps
# 1. Scan the paths and export the json file. The json file will contain a dictionary.
# 2. Enter the dictionary into ChatGPT along with the prompt.
# 3. Run this script with python3 translate.py

# Paths that need to be scanned
# Assumes MikoMiko is in the same directory as i18n-pick
# bin/i18n-pick.js scan ../MikoMiko/src/components ../MikoMiko/src/pages

# Export json file to a dict for easy translation
# bin/i18n-pick.js export

# ChatGPT prompt
# Translate the values to Chinese for me. Don't modify the key. Return the result in code block:

# Define the path to the translated dictionary
translated_dict_file = 'i18n-messages/zh.js'

with open(translated_dict_file) as f:
    translated_dict = json.load(f)

# Define the paths to the English and Chinese JSON files
original_file = 'i18n-messages/en.json'
translated_file = 'i18n-messages/zh.json'

with open(original_file) as f:
    original_data = json.load(f)

for data in original_data:
    if data['id'] not in translated_dict:
        continue
    # Change the messages in original_data to Chinese
    translated_message = translated_dict[data['id']]
    data['defaultMessage'] = translated_message

    # Iterate over the source locations in the JSON file
    source_locations = data['source']
    for location in source_locations:
        file_path = location['location'].split('#')[0]
        if not location['location'].split('#')[1].isdigit():
            continue
        line_number_start = int(location['location'].split('#')[1])
        line_number_end = int(location['location'].split('#')[3])

        # Replace the words in the specified location with the translated message
        with open(file_path, 'r') as f1:
            lines = f1.readlines()

        if line_number_start == line_number_end:
            line = lines[line_number_start - 1]
            line = line.replace(data['id'], translated_message)
            lines[line_number_start - 1] = line
        else:
            line = lines[line_number_start]
            first_word = data['id'].split(' ')[0]
            start = line.find(first_word) - 1
            line = line[:start] + '"' + translated_message + '",\n'
            lines[line_number_start] = line
            for i in range(line_number_start, line_number_end - 1):
                lines[i] = '\n'

        with open(file_path, 'w') as f:
            f.writelines(lines)

with open(translated_file, 'w', encoding='utf-8') as f:
    json.dump(original_data, f, ensure_ascii=False, indent=4)

