require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function productionSetup() {
  console.log('🚀 Starting production database setup...\n');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database URL exists:', !!process.env.DATABASE_URL);

  // Configure client based on environment
  const clientConfig = process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'student_lecturer_matching'
      };

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if tables exist
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('fields', 'lecturers', 'students', 'lecturer_fields', 'assignment_logs')
    `);

    console.log(`Found ${tableCheck.rows.length} existing tables`);

    if (tableCheck.rows.length === 0) {
      console.log('\n📋 Creating database schema...');
      
      // Read and execute schema
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      let schemaSQL = fs.readFileSync(schemaPath, 'utf8');
      
      // Remove CREATE DATABASE and \c commands for Render
      schemaSQL = schemaSQL
        .replace(/CREATE DATABASE.*?;/gi, '')
        .replace(/\\c.*?(\n|$)/gi, '');

      // Split by semicolon and execute each statement
      const statements = schemaSQL
        .split(';')
        .filter(stmt => stmt.trim().length > 0)
        .map(stmt => stmt.trim() + ';');

      for (const statement of statements) {
        try {
          await client.query(statement);
        } catch (err) {
          console.error('Error executing statement:', err.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      }
      
      console.log('✅ Schema created successfully');
    } else {
      console.log('✅ Tables already exist');
    }

    // Check if data exists
    const dataCheck = await client.query('SELECT COUNT(*) as count FROM fields');
    
    if (dataCheck.rows[0].count == 0) {
      console.log('\n📊 No data found. Running data population scripts...');
      
      // We'll insert data directly here instead of calling other scripts
      await populateFields(client);
      await populateLecturers(client);
      await populateLecturerFields(client);
      
      console.log('✅ Data population complete');
    } else {
      console.log(`✅ Data already exists (${dataCheck.rows[0].count} fields)`);
    }

    // Verify setup
    const verification = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM fields) as fields,
        (SELECT COUNT(*) FROM lecturers) as lecturers,
        (SELECT COUNT(*) FROM lecturer_fields) as assignments
    `);
    
    const stats = verification.rows[0];
    console.log('\n📈 Database Statistics:');
    console.log(`  - Fields: ${stats.fields}`);
    console.log(`  - Lecturers: ${stats.lecturers}`);
    console.log(`  - Field Assignments: ${stats.assignments}`);

    console.log('\n✅ Production setup complete!');

  } catch (error) {
    console.error('❌ Production setup failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function populateFields(client) {
  console.log('  - Inserting fields...');
  
  const fieldsSQL = `
    INSERT INTO fields (code, name, description, created_at, updated_at) VALUES
    ('epidemiology', 'Epidemiology', 'Study of disease patterns, causes, and effects in populations', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('biostatistics', 'Biostatistics', 'Application of statistics to biological and health data', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('environmental_health', 'Environmental Health', 'Study of environmental factors affecting human health', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('health_policy', 'Health Policy & Management', 'Development and analysis of health policies and healthcare systems', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('global_health', 'Global Health', 'Health issues that transcend national boundaries', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('maternal_child_health', 'Maternal & Child Health', 'Health of women during pregnancy, childbirth, and child development', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('nutrition', 'Public Health Nutrition', 'Role of nutrition in population health', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('infectious_diseases', 'Infectious Disease Control', 'Prevention and control of communicable diseases', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('chronic_diseases', 'Chronic Disease Prevention', 'Prevention and management of non-communicable diseases', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('mental_health', 'Mental Health', 'Mental health promotion and mental illness prevention', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('occupational_health', 'Occupational Health & Safety', 'Workplace health and safety issues', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('health_education', 'Health Education & Promotion', 'Educational strategies to improve health behaviors', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('community_health', 'Community Health', 'Health improvement at the community level', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('health_informatics', 'Health Informatics', 'Use of information technology in public health', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('health_economics', 'Health Economics', 'Economic analysis of health and healthcare', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('social_behavioral', 'Social & Behavioral Health', 'Social and behavioral factors affecting health', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('health_communication', 'Health Communication', 'Effective communication of health information', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('disaster_management', 'Disaster Management & Emergency Response', 'Public health preparedness and response', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('water_sanitation', 'Water, Sanitation & Hygiene (WASH)', 'Access to clean water and sanitation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('reproductive_health', 'Reproductive Health', 'Sexual and reproductive health services', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('adolescent_health', 'Adolescent Health', 'Health issues specific to adolescents', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('aging_health', 'Aging & Geriatric Health', 'Health of older adults and aging populations', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('substance_abuse', 'Substance Abuse Prevention', 'Prevention and treatment of substance use disorders', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('health_equity', 'Health Equity & Social Justice', 'Addressing health disparities and inequities', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('vaccine_preventable', 'Vaccine-Preventable Diseases', 'Immunization programs and vaccine development', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('vector_borne', 'Vector-Borne Disease Control', 'Control of diseases transmitted by vectors', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cancer_prevention', 'Cancer Prevention & Control', 'Cancer prevention, screening, and control programs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cardiovascular_health', 'Cardiovascular Health', 'Prevention of heart disease and stroke', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('diabetes_prevention', 'Diabetes Prevention & Management', 'Diabetes prevention and care programs', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('oral_health', 'Oral & Dental Public Health', 'Population-based oral health promotion', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('injury_prevention', 'Injury Prevention & Safety', 'Prevention of intentional and unintentional injuries', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('health_surveillance', 'Disease Surveillance Systems', 'Monitoring and tracking of disease patterns', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('antimicrobial_resistance', 'Antimicrobial Resistance', 'Combating antibiotic resistance', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('climate_health', 'Climate Change & Health', 'Health impacts of climate change', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('urban_health', 'Urban Health', 'Health challenges in urban environments', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rural_health', 'Rural Health', 'Healthcare access and delivery in rural areas', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('refugee_health', 'Refugee & Migrant Health', 'Health of displaced populations', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('indigenous_health', 'Indigenous Health', 'Health of indigenous populations', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('health_technology', 'Health Technology Assessment', 'Evaluation of health technologies', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('quality_improvement', 'Healthcare Quality Improvement', 'Improving healthcare quality and safety', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('patient_safety', 'Patient Safety', 'Preventing medical errors and harm', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('health_literacy', 'Health Literacy', 'Improving understanding of health information', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('telemedicine', 'Telemedicine & Digital Health', 'Remote healthcare delivery using technology', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('genomic_health', 'Genomics & Public Health', 'Application of genomics to population health', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('food_safety', 'Food Safety & Security', 'Ensuring safe and secure food supply', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('zoonotic_diseases', 'Zoonotic Disease Prevention', 'Diseases transmitted between animals and humans', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('health_workforce', 'Health Workforce Development', 'Training and retention of health workers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pharmaceutical_policy', 'Pharmaceutical Policy', 'Access to essential medicines and drug policy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('traditional_medicine', 'Traditional Medicine & Public Health', 'Integration of traditional healing practices', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('one_health', 'One Health Approach', 'Interconnection of human, animal, and environmental health', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (code) DO NOTHING
  `;
  
  await client.query(fieldsSQL);
}

async function populateLecturers(client) {
  console.log('  - Inserting lecturers...');
  
  const lecturersSQL = `
    INSERT INTO lecturers (name, email, max_students, created_at, updated_at) VALUES
    ('Dr. Kwame Asante', 'k.asante@university.edu', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Prof. Ama Mensah', 'a.mensah@university.edu', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Kofi Owusu', 'k.owusu@university.edu', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Akosua Boateng', 'a.boateng@university.edu', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Prof. Yaw Adomako', 'y.adomako@university.edu', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Efua Darko', 'e.darko@university.edu', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Kwesi Appiah', 'k.appiah@university.edu', 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Prof. Abena Osei', 'a.osei@university.edu', 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Nana Agyeman', 'n.agyeman@university.edu', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Adwoa Ansah', 'a.ansah@university.edu', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Prof. Kwabena Frimpong', 'k.frimpong@university.edu', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Esi Amankwah', 'e.amankwah@university.edu', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Kojo Nyarko', 'k.nyarko@university.edu', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Afia Sarpong', 'a.sarpong@university.edu', 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Prof. Fiifi Amoah', 'f.amoah@university.edu', 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Akua Donkor', 'a.donkor@university.edu', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Kweku Mensah', 'k.mensah@university.edu', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Prof. Aba Kusi', 'a.kusi@university.edu', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Kofi Adu', 'k.adu@university.edu', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Adjoa Badu', 'a.badu@university.edu', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Yaw Opoku', 'y.opoku@university.edu', 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Prof. Efua Tetteh', 'e.tetteh@university.edu', 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Kwame Bonsu', 'k.bonsu@university.edu', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Ama Gyamfi', 'a.gyamfi@university.edu', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Nii Quaye', 'n.quaye@university.edu', 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Prof. Akosua Manu', 'a.manu@university.edu', 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Kwabena Asiedu', 'k.asiedu@university.edu', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Adwoa Ofori', 'a.ofori@university.edu', 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Dr. Kofi Amponsah', 'k.amponsah@university.edu', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Prof. Esi Adjei', 'e.adjei@university.edu', 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (email) DO NOTHING
  `;
  
  await client.query(lecturersSQL);
}

async function populateLecturerFields(client) {
  console.log('  - Assigning fields to lecturers...');
  
  // Core assignments for common fields
  const coreAssignments = `
    INSERT INTO lecturer_fields (lecturer_id, field_id)
    SELECT l.id, f.id
    FROM lecturers l
    CROSS JOIN fields f
    WHERE 
      (l.email = 'k.asante@university.edu' AND f.code IN ('epidemiology', 'health_surveillance'))
      OR (l.email = 'a.mensah@university.edu' AND f.code IN ('biostatistics', 'health_informatics'))
      OR (l.email = 'k.owusu@university.edu' AND f.code IN ('environmental_health', 'climate_health', 'water_sanitation'))
      OR (l.email = 'a.boateng@university.edu' AND f.code IN ('maternal_child_health', 'reproductive_health'))
      OR (l.email = 'y.adomako@university.edu' AND f.code IN ('global_health', 'refugee_health'))
      OR (l.email = 'e.darko@university.edu' AND f.code IN ('infectious_diseases', 'vaccine_preventable', 'zoonotic_diseases'))
      OR (l.email = 'k.appiah@university.edu' AND f.code IN ('mental_health', 'substance_abuse'))
      OR (l.email = 'a.osei@university.edu' AND f.code IN ('health_policy', 'health_economics'))
      OR (l.email = 'n.agyeman@university.edu' AND f.code IN ('nutrition', 'aging_health'))
      OR (l.email = 'a.ansah@university.edu' AND f.code IN ('chronic_diseases', 'diabetes_prevention'))
      OR (l.email = 'k.frimpong@university.edu' AND f.code IN ('occupational_health', 'injury_prevention', 'patient_safety'))
      OR (l.email = 'e.amankwah@university.edu' AND f.code IN ('health_education', 'health_communication', 'health_literacy'))
      OR (l.email = 'k.nyarko@university.edu' AND f.code IN ('water_sanitation', 'food_safety', 'urban_health'))
      OR (l.email = 'a.sarpong@university.edu' AND f.code IN ('adolescent_health', 'substance_abuse', 'social_behavioral'))
      OR (l.email = 'f.amoah@university.edu' AND f.code IN ('vaccine_preventable', 'antimicrobial_resistance', 'infectious_diseases'))
      OR (l.email = 'a.donkor@university.edu' AND f.code IN ('cancer_prevention', 'cardiovascular_health', 'chronic_diseases'))
      OR (l.email = 'k.mensah@university.edu' AND f.code IN ('health_economics', 'pharmaceutical_policy', 'health_workforce'))
      OR (l.email = 'a.kusi@university.edu' AND f.code IN ('disaster_management', 'climate_health', 'one_health'))
      OR (l.email = 'k.adu@university.edu' AND f.code IN ('rural_health', 'indigenous_health', 'traditional_medicine'))
      OR (l.email = 'a.badu@university.edu' AND f.code IN ('aging_health', 'oral_health', 'nutrition'))
      OR (l.email = 'y.opoku@university.edu' AND f.code IN ('telemedicine', 'health_technology', 'health_informatics'))
      OR (l.email = 'e.tetteh@university.edu' AND f.code IN ('health_equity', 'social_behavioral', 'global_health'))
      OR (l.email = 'k.bonsu@university.edu' AND f.code IN ('vector_borne', 'infectious_diseases', 'epidemiology'))
      OR (l.email = 'a.gyamfi@university.edu' AND f.code IN ('genomic_health', 'biostatistics', 'health_informatics'))
      OR (l.email = 'n.quaye@university.edu' AND f.code IN ('maternal_child_health', 'reproductive_health', 'nutrition'))
    ON CONFLICT (lecturer_id, field_id) DO NOTHING
  `;
  
  await client.query(coreAssignments);
  
  // Generalists who can supervise multiple fields
  const generalistAssignments = `
    INSERT INTO lecturer_fields (lecturer_id, field_id)
    SELECT l.id, f.id
    FROM lecturers l
    CROSS JOIN fields f
    WHERE l.email IN (
      'a.manu@university.edu', 
      'k.asiedu@university.edu', 
      'a.ofori@university.edu',
      'k.amponsah@university.edu', 
      'e.adjei@university.edu'
    )
    AND f.code IN (
      'epidemiology', 'biostatistics', 'health_policy', 'global_health',
      'community_health', 'health_education', 'infectious_diseases'
    )
    ON CONFLICT (lecturer_id, field_id) DO NOTHING
  `;
  
  await client.query(generalistAssignments);
}

// Export for use in other scripts
module.exports = productionSetup;

// Run if called directly
if (require.main === module) {
  productionSetup()
    .then(() => {
      console.log('\n🎉 Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}
