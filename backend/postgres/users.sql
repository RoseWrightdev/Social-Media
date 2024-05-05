
CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  password varchar(255) NOT NULL,
  email varchar(255) NOT NULL UNIQUE CHECK (LENGTH(email) <= 255),
  username varchar(31) NOT NULL UNIQUE CHECK (LENGTH(username) <= 31)
  );