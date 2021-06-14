// Root project bin
var root = app.project.rootItem;
// Autocutter/SourceVideo/Subclips Bins
var acBin;
var sourceBin;
var subclipsBin;
// Timestamps from txt file
var timestamps = [];
// Subclip items
var subclips = [];
// Maximum timestamp & line of .txt it was recorded on
var maxTS = {
    time: 0,
    line: 0
};

if (main() == 0)
{
    alert("Complete");
}
else
{
    alert("AutoCutter Ended");
    if (acBin != null)
    {
        acBin.deleteBin();
    }

}

function main()
{
    // CREATE Bins
    acBin = newBin(root, "AutoCutter");
    sourceBin = acBin.createBin("source");
    subclipsBin = acBin.createBin("subclips");


    // FETCH source video file
    var sourceFile = fetchFile("video formats:*.3gp;*.avi;*.m2ts;*.mts;*.mp4;*.m4v;*.mov;*.mp4;*.m4v;*.mod;*.mpeg;*.m2v;*.mpg;*.m2t;*.mov;*.m4a;*.vob;*.wmv,audio formats:*.amr;*.aif;*.aiff;*.aac;*.ac3;*.mp3;*.mov;*.wav;*.wma"
    , "Select Source Media");
    if (sourceFile == 1) return 1;

    // FETCH timestamp text file
    var tsFile = fetchFile("*.txt", "Select Timestamp file");
    if (tsFile == 1) return 1;

    
    // LOAD Timestamps from file
    if (loadTimestamps(tsFile) == 1)
    {
        return 1;
    }

    // IMPORT Source Video
    if (importVideo(sourceFile) == 1)
    {
        alert("Video Import Failed");
        return 1;
    }

    // CREATE Subclips from Source Video
    if (createSubclips(subclips) == 1)
    {
        alert("Failed to Create Subclips");
        return 1;
    }
    
    // COMBINE Clips into a Sequence
    app.project.createNewSequenceFromClips("new sequence", subclips, acBin);

    return 0;
}


// LOADS Timestamps to Array
function loadTimestamps(file)
{
    //READ FILE
    var count = 0; // number of timestamps loaded
    var line = 1; // line number of text file - starting from 1
    file.open('r');

    while(!file.eof)
    {
        var ts = [];
        var currentline = file.readln();
        currentline = currentline.replace(/\s/g, "");

        if (currentline == "")
        {
            line++;
            continue;
        }

        // ERROR CHECK - each line should be [start time]-[end time]
        if (currentline.split('-').length != 2)
        {
            file.close();
            alert("Timestamp Error on line " + line);
            return 1;
        }

        ts = currentline.split('-');
        //arr.push(currentline.split('-'));

        // Convert timestamp to seconds
        ts[0] = convertToSec(ts[0]);
        ts[1] = convertToSec(ts[1]);

        // ERROR - unable to convert to seconds
        if (ts[0] == -1 || ts[1] == -1)
        {
            file.close();
            alert("Timestamp Error on line " + line);
            return 1;
        }

        // ERROR CHECK - start must be less than end
        if (ts[0] >= ts[1])
        {
            file.close();
            alert("Timestamp Error on line " + line);
            return 1;
        }

        // UPDATE max timestamp
        if (ts[1] > maxTS.time)
        {
            maxTS.time = ts[1];
            maxTS.line = line;
        }

        timestamps.push(ts);

        line++;
        count++;
    }

    file.close();

    // ERROR - text file must contain timestamps
    if (timestamps.length == 0)
    {
        alert("Error: No timestamps found in .txt file");
        return 1;
    }

    return 0;
}

// CONVERTS timestamp to SECONDS
function convertToSec(timestamp)
{
    var sep = "";

    // finding seperator ":" or "."
    if (timestamp.split(":").length == 2)
        sep = ":";
    else if (timestamp.split(".").length == 2)
        sep = ".";
    else // ERROR CHECK - must contain one ":" or "."
        return -1;

    var min = timestamp.split(sep)[0];
    var sec = timestamp.split(sep)[1];

    // ERROR CHECK - must be integers
    if (!isInt(min) || !isInt(sec) )
    {
        return -1;
    }

    // ERROR CHECK - seconds must be less than 60
    if (sec >= 60)
    {
        return -1;
    }

    return parseInt(min) * 60 + parseInt(sec);
}

// Import Source Video
function importVideo(file)
{
    // IMPORT VIDEO
    app.project.importFiles(file.fsName, 0, sourceBin, 0);
    
    var timeLength = sourceBin.children[0].getOutPoint(0);

    if (maxTS.time > timeLength.seconds)
    {
        sourceBin.deleteBin();
        alert("Timestamp Error on line " + maxTS.line + ":\nA timestamp does not exist in media");
        return 1;
    }

    return 0;
}


// CREATES SUBCLIPS and add to array
function createSubclips(subclips)
{
    // Create Subclips from source video
    for (var i = 0; i < timestamps.length; i++)
    {
        // Name of clip as seen in project panel
        var name = "clip" + (i < 100 ? 0:"") + (i < 10 ? 0:"") + i;

        // Start and End times of timestamp
        var start = timestamps[i][0];
        var end = timestamps[i][1];
        
        // CREATE clip
        var clip = sourceBin.children[0].createSubClip(name, start, end, 0, 1, 1);

        // MOVE clip to subclip bin
        clip.moveBin(subclipsBin);

        // ADD clip to array of clips for inserting later
        subclips.push(clip);
    }

    return 0;
}


//------------------------------------------------------------------------------
// MISC FUNCTIONS

// RETURNS OBJECT OF ITEM IN A BIN ITEM - BUT NOT IN SUB-BINS
function findItem(name, currentBin)
{
    var numChildren = currentBin.children.numItems;
    for (var i = 0; i < numChildren; i++)
    {
        var child = currentBin.children[i];
        if (child.name.toLowerCase() == name.toLowerCase())
        {
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

// RETURNS user selected file after validation
function fetchFile(formats, displayMessage)
{
    alert(displayMessage); 
    var file = File.openDialog(displayMessage, "");
    
    // ERROR CHECK - is file NULL?
    if (file == null)
    {
        alert("File not selected");
        return 1;
    }

    var i = file.displayName.lastIndexOf(".");
    var formatName = file.displayName.substring(i, file.displayName.length);

    // ERROR CHECK - is correct filetype?
    if (formats.indexOf(formatName) == -1)
    {
        alert("Wrong file format.");
        return 1;
    }

    return file;
}

// Creates a new BIN whilst checking for identical names. 
function newBin(bin, name)
{
    var count = 0;
    var finalName = name;

    while (findItem(finalName, bin) != null)
    {
        finalName = name + "-" + (count < 10 ? "0":"") + count;
        count++;
    }

    return bin.createBin(finalName);
}