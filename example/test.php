<?php
  header('Content-type:text/html; charset="utf8"');

  sleep(10);
  $data = array(
    array('name' => 'zhangsan', 'sex' => 'man'),
    array('name' => 'lisi', 'sex' => 'woman')
  );
  echo json_encode($data);