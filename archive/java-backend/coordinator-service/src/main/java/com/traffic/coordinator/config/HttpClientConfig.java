package com.traffic.coordinator.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

/**
 * HTTP Client Configuration.
 *
 * DISTRIBUTED SYSTEMS ARCHITECTURE NOTE (VIVA / EXAM CONTEXT):
 * In distributed computing, downstream services can fail, stall, or suffer from network
 * partitions. Without explicit connection and socket read timeouts, incoming threads on
 * the coordinator would block indefinitely, exhausting the Tomcat worker thread pool
 * (Cascading Failure).
 *
 * Here we configure Spring 3's RestClient and RestTemplate with bounded timeouts
 * (2.0s connect, 2.5s read) to guarantee prompt fallback and bounded response times for callers.
 */
@Configuration
public class HttpClientConfig {

    private final CoordinatorProperties properties;

    public HttpClientConfig(CoordinatorProperties properties) {
        this.properties = properties;
    }

    @Bean
    public SimpleClientHttpRequestFactory clientHttpRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getHttp().getConnectTimeoutMs());
        factory.setReadTimeout(properties.getHttp().getReadTimeoutMs());
        return factory;
    }

    @Bean
    public RestClient restClient(SimpleClientHttpRequestFactory requestFactory) {
        return RestClient.builder()
                .requestFactory(requestFactory)
                .build();
    }

    @Bean
    public RestTemplate restTemplate(SimpleClientHttpRequestFactory requestFactory) {
        return new RestTemplate(requestFactory);
    }
}
