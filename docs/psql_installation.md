# Installing PostgreSQL Client Tools (psql)

This guide provides instructions for installing the PostgreSQL command-line tool (psql) on different operating systems.

## Windows

### Method 1: Using the PostgreSQL Installer (Recommended)

1. Download the PostgreSQL installer from the [official website](https://www.postgresql.org/download/windows/)
2. Run the installer
3. You only need the command-line tools, so you can uncheck the server component during installation
4. Make sure to select the "Command Line Tools" option
5. Complete the installation
6. Add the PostgreSQL bin directory to your PATH:
   - Default location: `C:\Program Files\PostgreSQL\[version]\bin`

### Method 2: Using the Windows Subsystem for Linux (WSL)

If you have WSL installed:

```bash
sudo apt update
sudo apt install postgresql-client
```

## macOS

### Using Homebrew

```bash
brew install libpq
brew link --force libpq
```

This installs PostgreSQL client tools including psql without the server.

## Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install postgresql-client
```

## Verification

To verify that psql is installed correctly, open a terminal or command prompt and run:

```
psql --version
```

You should see output showing the psql version.

## Connecting to Neon DB

To connect to Neon DB with psql, use:

```
psql "postgresql://username:password@hostname:port/database?sslmode=require"
```

Replace the connection string with your actual Neon DB connection string from the .env file.

## Troubleshooting

If you get a "command not found" error after installation:

1. Make sure the installation completed successfully
2. Check if the PostgreSQL bin directory is in your PATH
3. Try restarting your terminal or command prompt
4. On Windows, you might need to log out and log back in for PATH changes to take effect 