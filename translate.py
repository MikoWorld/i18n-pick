import json
import re

# Steps
# 1. Scan the paths and export the json file. The json file will contain a dictionary.
# 2. Enter the dictionary into ChatGPT along with the prompt.
# 3. Run this script with `python3 translate.py`

# Paths that need to be scanned
# Assumes MikoMiko is in the same directory as i18n-pick
# bin/i18n-pick.js scan ../MikoMiko/src/components ../MikoMiko/src/pages ../MikoMiko/src/server

# Export json file to a dict for easy translation
# bin/i18n-pick.js export

# ChatGPT prompt
# Translate the values to Chinese for me. Don't modify the key. Return the result in code block:

# Define the path to the translated dictionary
translated_dict_file = 'zh.js'

with open(translated_dict_file) as f:
    translated_dict = json.load(f)

# Define the paths to the English and Chinese JSON files
original_file = 'i18n-messages/en.json'
translated_file = 'i18n-messages/zh.json'

with open(original_file) as f:
    original_data = json.load(f)

for data in original_data:
    if data['id'] not in translated_dict:
        print(data['id'] + ' not found')
        continue

    # Replace messages with translations
    translated_message = translated_dict[data['id']]
    data['defaultMessage'] = translated_message

    # Iterate over the source locations in the JSON file
    source_locations = data['source']
    for location in source_locations:
        file_path = location['location'].split('#')[0]

        # If there are no line numbers, find and replace words in the whole file
        if not location['location'].split('#')[1].isdigit():
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
            except FileNotFoundError:
                continue

            # Only replace words enclosed in ' ', to rule out variable names
            pattern = re.compile(r"(?<=')(?:" + re.escape(data['id']) + r")(?=')")
            translated_content = pattern.sub(translated_message, content)
            with open(file_path, 'w') as f:
                f.write(translated_content)
            continue
        
        line_number_start = int(location['location'].split('#')[1])
        line_number_end = int(location['location'].split('#')[3])

        # Replace the words in the specified location with the translated message
        with open(file_path, 'r') as f:
            lines = f.readlines()

        if line_number_start == line_number_end:
            line = lines[line_number_start - 1]
            line = line.replace(data['id'], translated_message)
            lines[line_number_start - 1] = line
        else:
            is_translated = False
            key = data['id']
            for line_num in range(line_number_start, line_number_end):
                if not key:
                    break

                line = lines[line_num]
                first_word = key.split()[0]
                key_start = line.find(first_word)
                if key_start == -1:
                    continue

                # Find longest matching substring, in the case 
                # where the sentence is broken into two lines
                match_len = 0
                for i in range(min(len(key), len(line))):
                    if line[i + key_start] == key[i]:
                        match_len += 1
                    else:
                        break
                
                replacement = translated_message if not is_translated else ''
                line = line[:key_start] + replacement + line[key_start + match_len:]

                lines[line_num] = line

                is_translated = True
                key = key[match_len:].lstrip()

        with open(file_path, 'w') as f:
            f.writelines(lines)

with open(translated_file, 'w', encoding='utf-8') as f:
    json.dump(original_data, f, ensure_ascii=False, indent=4)

