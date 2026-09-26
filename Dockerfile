# Multi-stage Dockerfile for WeeklySupervisorProgram
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["WeeklySupervisorProgram/WeeklySupervisorProgram.csproj", "WeeklySupervisorProgram/"]
RUN dotnet restore "WeeklySupervisorProgram/WeeklySupervisorProgram.csproj"

COPY . .
WORKDIR "/src/WeeklySupervisorProgram"
RUN dotnet build "WeeklySupervisorProgram.csproj" -c Release -o /app/build
RUN dotnet publish "WeeklySupervisorProgram.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 80
EXPOSE 443

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:80
ENV TZ=Asia/Hebron

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WeeklySupervisorProgram.dll"]
