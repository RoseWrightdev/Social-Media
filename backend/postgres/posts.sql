CREATE TABLE posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid NOT NULL,
  content varchar(255) NOT NULL,
  image_path varchar(255),
  video_path varchar(255)
  );