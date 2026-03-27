<?php

$result = json_encode($_POST);

//Create 3D Print Order Info JSON file
$content = $result;
$uploaddir = '../uploads/';

foreach($_POST['filenames'] as $file)
{
    $fp = fopen($uploaddir . "/" . basename($file) . ".json", "wb");
    fwrite($fp, $content);
    fclose($fp);
}

echo $result;

?>