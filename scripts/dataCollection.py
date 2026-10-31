import json
import copy
import os
import re



def StateTextFilesAggregated(output_path):


    currentDirectoryPath = os.path.dirname(os.path.realpath(__file__))

    for root, dirs, files in os.walk(currentDirectoryPath + '/namesbystate'):

        with open(output_path, 'w', encoding='utf-8') as outputFile:

            for file in sorted(files):

                file_path = os.path.join(root, file)

                if not (file.endswith('.TXT')):
                    continue

                with open(file_path, 'r', encoding='utf-8') as currentFile:

                    for line in currentFile:
                        outputFile.write(line)


def NationalTextFilesAggregated(output_path):


    currentDirectoryPath = os.path.dirname(os.path.realpath(__file__))

    for root, dirs, files in os.walk(currentDirectoryPath + '/names-1910'):

        with open(output_path, 'w', encoding='utf-8') as outputFile:

            for file in sorted(files):

                file_path = os.path.join(root, file)

                if not (file.endswith('.txt')):
                    continue

                fileNameToBeProcessed = str(file)
                fileYear = re.sub(r"\D", "", fileNameToBeProcessed)

                with open(file_path, 'r', encoding='utf-8') as currentFile:

                    for line in currentFile:
                        newAddition = fileYear + ',' + line
                        outputFile.write(newAddition)
                        # print(newAddition)


def NationalJSONGenerator(input_path, output_path):

    newGender = ''
    oldGender = ''
    newYear = ''
    oldYear = ''
    start = True

    jsonDict = {}

    with open(input_path, 'r', encoding='utf-8') as file:
        for line in file:

            lineArray = line.split(',')
            lineArray[3] = lineArray[3].rstrip()
            lineArray[3] = int(lineArray[3])

            newYear = lineArray[0]
            newGender = lineArray[2]

            if start:
                start = False
                oldYear = newYear
                oldGender = newGender
                genderDict = {}
                nameDict = {}
                nameDict[lineArray[1]] = lineArray[3]
                genderDict[newGender] = copy.deepcopy(nameDict)
                jsonDict.update({newYear: copy.deepcopy(genderDict)})

            elif newYear != oldYear:
                oldYear = newYear
                oldGender = newGender
                genderDict = {}
                nameDict = {}
                nameDict[lineArray[1]] = lineArray[3]
                genderDict[oldGender] = copy.deepcopy(nameDict)
                jsonDict.update({oldYear: copy.deepcopy(genderDict)})

            elif newGender != oldGender:
                oldGender = newGender
                nameDict = {}
                nameDict[lineArray[1]] = lineArray[3]
                jsonDict[oldYear].update({oldGender: copy.deepcopy(nameDict)})

            else:
                jsonDict[oldYear][oldGender].update({lineArray[1]: lineArray[3]})

        with open(output_path, 'w', encoding='utf-8') as f_out:
            # Use indent=None for a smaller file size, or indent=2 for human readability during debugging
            #print(list(jsonDict['AK']['F']['1910']))
            json.dump(jsonDict, f_out, indent=None)


def StateJSONGenerator(input_path, output_path):
    newState = ''
    oldState = ''
    newGender = ''
    oldGender = ''
    newYear = ''
    oldYear = ''
    start = True

    jsonDict = {}

    with open(input_path, 'r', encoding='utf-8') as file:
        for line in file:

            lineArray = line.split(',')
            lineArray[4] = lineArray[4].rstrip()
            lineArray[4] = int(lineArray[4])

            newState = lineArray[0]
            newGender = lineArray[1]
            newYear = lineArray[2]

            if start:
                start = False
                oldState = newState
                oldGender = newGender
                oldYear = newYear
                genderDict = {}
                yearDict = {}
                nameDict = {}
                nameDict[lineArray[3]] = lineArray[4]
                yearDict[newYear] = copy.deepcopy(nameDict)
                genderDict[newGender] = copy.deepcopy(yearDict)
                jsonDict.update({newState: copy.deepcopy(genderDict)})

            elif newState != oldState:
                oldState = newState
                oldGender = newGender
                oldYear = newYear
                genderDict = {}
                yearDict = {}
                nameDict = {}
                nameDict[lineArray[3]] = lineArray[4]
                yearDict[oldYear] = copy.deepcopy(nameDict)
                genderDict[oldGender] = copy.deepcopy(yearDict)
                jsonDict.update({oldState: copy.deepcopy(genderDict)})

            elif newGender != oldGender:
                oldGender = newGender
                oldYear = newYear
                yearDict = {}
                nameDict = {}
                nameDict[lineArray[3]] = lineArray[4]
                yearDict[newYear] = copy.deepcopy(nameDict)
                jsonDict[oldState].update({oldGender: copy.deepcopy(yearDict)})

            elif newYear != oldYear:
                oldYear = newYear
                nameDict = {}
                nameDict[lineArray[3]] = lineArray[4]
                jsonDict[oldState][oldGender].update({oldYear: copy.deepcopy(nameDict)})


            else:
                jsonDict[oldState][oldGender][oldYear].update({lineArray[3]: lineArray[4]})

        with open(output_path, 'w', encoding='utf-8') as f_out:
            # Use indent=None for a smaller file size, or indent=2 for human readability during debugging
            #print(list(jsonDict['AK']['F']['1910']))
            json.dump(jsonDict, f_out, indent=None)






if __name__ == '__main__':

    # StateTextFilesAggregated("StateBabyNames-Aggregated.txt")
    # INPUT_FILE = "StateBabyNames-Aggregated.txt"
    # OUTPUT_FILE = "baby_names.json"
    # StateJSONGenerator(INPUT_FILE, OUTPUT_FILE)


    #NationalTextFilesAggregated("NationalBabyNames-Aggregated.txt")
    # INPUT_FILE = "NationalBabyNames-Aggregated.txt"
    # OUTPUT_FILE = "national_baby_names.json"
    # NationalJSONGenerator(INPUT_FILE, OUTPUT_FILE)

    print("something")