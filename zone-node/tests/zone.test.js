import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Zone Node - Input Validation and Logic Tests', () => {
  const VALID_TYPES = ['ACCIDENT', 'TRAFFIC_JAM', 'HAZARD', 'ROAD_CLOSED'];
  const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'];
  const VALID_STATUSES = ['ACTIVE', 'INVESTIGATING', 'RESOLVED'];

  function validateIncidentInput({ type, severity, description, status }) {
    const errors = {};
    if (!type || !VALID_TYPES.includes(type.toUpperCase())) {
      errors.type = `Incident type must be one of: ${VALID_TYPES.join(', ')}`;
    }
    if (!severity || !VALID_SEVERITIES.includes(severity.toUpperCase())) {
      errors.severity = `Incident severity must be one of: ${VALID_SEVERITIES.join(', ')}`;
    }
    if (!description || description.trim().length < 5 || description.trim().length > 500) {
      errors.description = 'Description must be between 5 and 500 characters';
    }
    if (status && !VALID_STATUSES.includes(status.toUpperCase())) {
      errors.status = `Incident status must be one of: ${VALID_STATUSES.join(', ')}`;
    }
    return errors;
  }

  test('Valid input passes validation without errors', () => {
    const errors = validateIncidentInput({
      type: 'ACCIDENT',
      severity: 'HIGH',
      description: 'Multi-vehicle collision on North Highway',
      status: 'ACTIVE',
    });
    assert.equal(Object.keys(errors).length, 0);
  });

  test('Rejects invalid type and short description', () => {
    const errors = validateIncidentInput({
      type: 'INVALID_TYPE',
      severity: 'HIGH',
      description: 'Tiny',
    });
    assert.ok(errors.type);
    assert.ok(errors.description);
  });

  test('Rejects missing severity', () => {
    const errors = validateIncidentInput({
      type: 'ACCIDENT',
      description: 'Valid long enough description',
    });
    assert.ok(errors.severity);
  });

  test('Idempotency: Simulates detecting duplicate ID and returning existing record', () => {
    const store = new Map();
    const existing = {
      id: 'INC-SOUTH-999',
      zoneId: 'SOUTH',
      type: 'ACCIDENT',
      severity: 'HIGH',
      description: 'Overturned truck',
      status: 'ACTIVE',
    };
    store.set(existing.id, existing);

    // Submission 1: ID already in store
    const duplicateId = 'INC-SOUTH-999';
    let isDuplicate = false;
    let result = null;

    if (store.has(duplicateId)) {
      isDuplicate = true;
      result = store.get(duplicateId);
    } else {
      result = { id: duplicateId };
      store.set(duplicateId, result);
    }

    assert.equal(isDuplicate, true);
    assert.equal(result.id, 'INC-SOUTH-999');
    assert.equal(store.size, 1); // Size unchanged!
  });
});
