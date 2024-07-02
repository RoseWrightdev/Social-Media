CREATE TABLE posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id uuid NOT NULL,
  text_content varchar(256) NOT NULL,
);