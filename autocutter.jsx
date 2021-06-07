alert(main() == 0 ? "Complete!":"Action Failed.");

function main()
{
    // REGISTER BINS & FILES
    var root = app.project.rootItem;

    // IMPORT SOURCE VIDEO
    if (importVideo() != 0)
    {
        alert("Video Import Failed");
        return 1;
    }

    
    // LOAD TIMESTAMP FILE
    var timestamps = [];

    // Load timestamps from textfile
    if (loadTimestamps(timestamps) == 1)
    {
        alert("Failed to Load Timestamps");
        return 1;
    }

    // Convert timestamps to seconds
    if (convertTimestamps(timestamps) == 1)
    {
        alert("Failed to Convert Timestamps");
        return 1;
    }


    // CREATE NEW SEQUENCE
    var seq = createSequence()
    if (seq == 1)
    {
        alert("Failed to Create Sequence");
        return 1;
    }


    // CREATE SUBCLIPS,
    var subclips = [];
    if (createSubclips(timestamps, subclips) == 1)
    {
        alert("Failed to Create Subclips");
        return 1;
    }
    

    //ADD CLIPS TO SEQUENCE    
    var seq = findItem("seq00", root);
    if (addClipsToSequence(subclips, seq.name) == 1)
    {
        alert("Failed to Add Clips to Sequence");
        return 1;
    }


    return 0;
}


function importVideo()
{
    alert("Select Video to cut");

    var file = File.openDialog("Select Source Video", "*.mp4");

    if (file == null)
    {
        alert("file not selected");
        return 1;
    }

    var sourceBin = findItem("source", app.project.rootItem);

    if (sourceBin == null)
    {
        sourceBin = app.project.rootItem.createBin("source");
    }


    if (findItem(file.displayName, sourceBin) != null)
    {
        if (confirm("File already exists. Do you want to cut this file?",false))
        {
            return 0;
        }
    }

    app.project.importFiles(file.fsName, 0, sourceBin, 0);
    
    return 0;
}


// LOADS Timestamps to Array
function loadTimestamps(arr)
{
    alert("Select Timestamp .txt file");
    var file = File.openDialog("Select Text File", "*.txt");

    // ERROR CHECK - is file NULL
    if (file == null)
    {
        alert("Text file not selected");
        return 1;
    }

    var path = file.fsName;

    // ERROR CHECK - is file a .txt
    if (path.substring(path.length-4, path.length) != ".txt")
    {
        log("timestamp filetype is not a .txt!");
        return 1;
    }

    //READ FILE
    file.open('r');
    var count = 0; // number of timestamps loaded
    var line = 1; // line number of text file - starting from 1
    while(!file.eof)
    {
        var currentline = file.readln();
        currentline = currentline.replace(" ", "");

        if (currentline == "")
        {
            line++;
            continue;
        }

        // ERROR CHECK - each line should be [start time]-[end time] where [*] are timestamps
        if (currentline.split('-').length != 2)
        {
            log("Text file formatting error[1] on line " + line);
            file.close();
            return 1;
        }

        arr.push(currentline.split('-'));
        arr[count].push(line);

        line++;
        count++;
    }
    file.close();

    if (arr.length == 0)
    {
        log("Error: No Timestamps Loaded");
        return 1;
    }

    return 0;
}

// CONVERTS timestamps to SECONDS
function convertTimestamps(arr)
{
    // LOOP through each timestamp pair
    for (var i = 0; i < arr.length; i++)
    {
        var start = arr[i][0].split(':');
        var end = arr[i][1].split(':');

        // ERROR CHECK - has one ':'
        if (start.length != 2 || end.length != 2)
        {
            log("Text file formatting error[2] on line " + (arr[i][2]));
            return 1;
        }

        // ERROR CHECK - must be integers
        if (!isInt(start[0]) || !isInt(start[1])
         || !isInt(end[0]) || !isInt(end[1]) )
        {
            log("Text file formatting error[3] on line " + (arr[i][2]));
            return 1;
        }

        // ERROR CHECK - seconds must be less than 60
        if (start[1] >= 60 || end[1] >= 60)
        {
            log("Text file formatting error[4] on line " + (arr[i][2]));
            return 1;
        }

        // CONVERT to seconds
        arr[i][0] = parseInt(start[0]) * 60 + parseInt(start[1]);
        arr[i][1] = parseInt(end[0]) * 60 + parseInt(end[1]);

        //ERROR CHECK - start must be less than end
        if (arr[i][0] >= arr[i][1])
        {
            log("Text file formatting error[5] on line " + (arr[i][2]));
            return 1;
        }
        
    }

    return 0;
}

// CREATES A NEW SEQUENCE BASED ON SET PRESET
function createSequence()
{
    var name = "";
    var count = 0;
    
    do
    {
        name = "seq" + (count < 10 ? 0:"") + count;
        count++;
        if (count > 100)
            return 1;
    } while(findItem(name, app.project.rootItem) != null)
    
    app.project.createNewSequence(name,"ID-" + name);

    return name;
}


// CREATES SUBCLIPS AND ADDS THEM TO NEW SEQUENCE
function createSubclips(timestamps, subclips)
{
    var root = app.project.rootItem;
    var sourceBin = findItem("source", root);
    var subclipBin = findItem("subclips", root);
    
    // ERROR CHECK - is there ONE video in the source bin
    if (sourceBin.children.length == 0)
    {
        log("Please place a source video in the \"source\" bin.");
        return 1;
    }
    if (sourceBin.children.length > 1)
    {
        log("There shouhld only be ONE (1) video in the \"source\" bin.");
        return 1;
    }

    // FIND Subclips Bin
    if (subclipBin == null)
    {
        subclipBin = root.createBin("subclips");
    }

    //  ERROR CHECK -  is subclip bin empty
    if (subclipBin.children.length != 0)
    {
        log("Error: Subclip Bin should be Empty");
        return 1;
    }

    // Create Subclips from source video
    for (var i = 0; i < timestamps.length; i++)
    {
        var name = "clip" + (i < 100 ? 0:"") + (i < 10 ? 0:"") + i;
        var start = timestamps[i][0];
        var end = timestamps[i][1];
    
        sourceBin.children[0].createSubClip(name, start, end, 0, 1, 1);

        findItem(name, root).moveBin(subclipBin);

        subclips.push(findItem(name,subclipBin));
    }

    return 0;
}


function addClipsToSequence(clips, seqName)
{
    // ERROR - is subclips folder empty
    if (clips.length < 1)
    {
        log("Error: no subclips found");
        return 1;
    }

    // FIND SEQUENCE
    var seq = findSequence(seqName);
    if (seq == 1)
    {
        log("No sequence found");
        return 1;
    }

    // OPEN SEQUENCE
    if(!app.project.openSequence(seq.sequenceID))
    {
        log("Error: activating sequenece was unsuccessful");
        return 1;
    }

    // ADD CLIPS TO SEQUENCE
    for (var i = clips.length - 1; i >= 0; i--)
    {
        seq.videoTracks[0].insertClip(clips[i],0);
    }
    return 0;
}



//------------------------------------------------------------------------------
// MISC FUNCTIONS

// WRITES ALL ITEMS IN AN ARRAY INTO THE CONSOLE
function writeAll(arr)
{
    for (var i = 0; i < arr.length; i++)
    {
        log(arr[i] + "\n");
    }
    
}


// RETURNS OBJECT OF ITEM IN A BIN ITEM - BUT NOT IN SUB-BINS
function findItem(name, currentBin)
{
    var numChildren = currentBin.children.numItems;
    for (var i = 0; i < numChildren; i++)
    {
        var child = currentBin.children[i];
        if (child.name.toLowerCase() == name.toLowerCase())
        {
            //log(name + " FOUND!\n");
            return child;
        } 
    }
    return null;
}

// CHECKS IF VALUE IS AN INTEGER
function isInt(value) 
{
    return !isNaN(value) && parseInt(value) == value;
}

// PRINTS TO CONSOLE
function log(str)
{
    $.write(str + "\n");
}

// FINDS SEQUENCE
function findSequence(name)
{
    var seqs = app.project.sequences
    for (var i = 0; i < seqs.length; i++)
    {
        if (seqs[i].name == name)
        {
            return seqs[i];
        }
    }
    return 1;
}