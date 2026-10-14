package com.traffic.coordinator;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.env.Environment;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CoordinatorApplication {

    private static final Logger log = LoggerFactory.getLogger(CoordinatorApplication.class);

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(CoordinatorApplication.class);
        Environment env = app.run(args).getEnvironment();
        String port = env.getProperty("server.port", "8080");

        log.info("=================================================================");
        log.info(" Traffic Coordinator Service Started Successfully!");
        log.info(" Coordinator Port : {}", port);
        log.info(" City Report API  : http://localhost:{}/api/coordinator/city-report", port);
        log.info(" Zone Status API  : http://localhost:{}/api/coordinator/nodes", port);
        log.info(" Coordinator Health: http://localhost:{}/api/coordinator/health", port);
        log.info("=================================================================");
    }
}
