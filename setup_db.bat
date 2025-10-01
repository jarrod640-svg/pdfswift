@echo off
set PGPASSWORD=Claude6402!!
"C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres pdfswift
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d pdfswift -f config\database.sql
echo Database setup complete!
pause
