-- Normaliza o nome da editora em todos os livros existentes
UPDATE books
SET publisher = 'Editora Jocum'
WHERE publisher ILIKE '%grainup%'
   OR publisher ILIKE '%grain up%'
   OR publisher = 'Jocum Brasil'
   OR publisher = 'GrainUp Editora';
