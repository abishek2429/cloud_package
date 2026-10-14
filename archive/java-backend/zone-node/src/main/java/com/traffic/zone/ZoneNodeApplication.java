package com.traffic.zone;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.env.Environment;

@SpringBootApplication
public class ZoneNodeApplication {

    private static final Logger log = LoggerFactory.getLogger(ZoneNodeApplication.class);

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(ZoneNodeApplication.class);
        Environment env = app.run(args).getEnvironment();
        String port = env.getProperty("server.port", "8081");
        String zoneId = env.getProperty("zone.id", "NORTH");
        String zoneName = env.getProperty("zone.name", "North Zone");

        log.info("=================================================================");
        log.info(" Traffic Zone Node Started Successfully!");
        log.info(" Zone ID   : {}", zoneId);
        log.info(" Zone Name : {}", zoneName);
        log.info(" HTTP Port : {}", port);
        log.info(" Endpoints : http://localhost:{}/api/incidents", port);
        log.info(" Health    : http://localhost:{}/api/health", port);
        log.info("=================================================================");
    }
}
