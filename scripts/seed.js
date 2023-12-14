import bcrypt from 'bcrypt';
import {
  customers,
  invoices,
  revenue,
  users,
} from '../app/lib/placeholder-data.js';
import { supabase } from '../app/lib/supabase-client.js';

async function seedUsers() {
  try {
    // Insert data into the "users" table
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const { error: insertError } = await supabase
        .from('users')
        .insert([
          { id: user.id, name: user.name, email: user.email, password: hashedPassword }
        ])

      if (insertError) throw insertError;
    }

    console.log(`Seeded users`);

  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}

async function seedInvoices() {
  try {
    // Insert data into the "invoices" table
    for (const invoice of invoices) {
      const { error: insertError } = await supabase
        .from('invoices')
        .insert([
          { customer_id: invoice.customer_id, amount: invoice.amount, status: invoice.status, date: invoice.date }
        ])

      if (insertError) throw insertError;
    }

    console.log(`Seeded invoices`);

  } catch (error) {
    console.error('Error seeding invoices:', error);
    throw error;
  }
}

async function seedCustomers() {
  try {
    // Insert data into the "customers" table
    for (const customer of customers) {
      const { error: insertError } = await supabase
        .from('customers')
        .insert([
          { id: customer.id, name: customer.name, email: customer.email, image_url: customer.image_url }
        ])

      if (insertError) throw insertError;
    }

    console.log(`Seeded customers`);

  } catch (error) {
    console.error('Error seeding customers:', error);
    throw error;
  }
}

async function seedRevenue() {
  try {
    // Insert data into the "revenue" table
    for (const rev of revenue) {
      const { error: insertError } = await supabase
        .from('revenue')
        .insert([
          { month: rev.month, revenue: rev.revenue }
        ])

      if (insertError) throw insertError;
    }

    console.log(`Seeded revenue`);

  } catch (error) {
    console.error('Error seeding revenue:', error);
    throw error;
  }
}

async function main() {
  try {
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();
  } catch (error) {
    console.error('An error occurred while attempting to seed the database:', error);
  }
}

main();
