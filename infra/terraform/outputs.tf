output "instance_id" {
  value = aws_instance.madypro_prod.id
}

output "public_ip" {
  description = "Elastic IP — pointer les A records app./api./dev./api-dev./traefik.madyproclean.com ici"
  value       = aws_eip.madypro_prod.public_ip
}

output "ssh_private_key_path" {
  value = local_sensitive_file.private_key.filename
}

output "ssh_command" {
  value = "ssh -i ${local_sensitive_file.private_key.filename} ubuntu@${aws_eip.madypro_prod.public_ip}"
}
