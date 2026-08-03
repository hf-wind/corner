UPDATE "categories"
SET "icon" = CASE "icon"
  WHEN 'FolderOutlined' THEN 'ph:folder-open-bold'
  WHEN 'FolderOpenOutlined' THEN 'ph:folder-open-bold'
  WHEN 'VideoCameraOutlined' THEN 'ph:video-camera-bold'
  ELSE "icon"
END
WHERE "icon" IN ('FolderOutlined', 'FolderOpenOutlined', 'VideoCameraOutlined');

UPDATE "tags"
SET "icon" = CASE "icon"
  WHEN 'TagOutlined' THEN 'ph:tag-bold'
  WHEN 'TagsOutlined' THEN 'ph:tags-bold'
  WHEN 'VideoCameraOutlined' THEN 'ph:video-camera-bold'
  ELSE "icon"
END
WHERE "icon" IN ('TagOutlined', 'TagsOutlined', 'VideoCameraOutlined');
