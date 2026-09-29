variable "aws_region" {
  description = "Região da AWS para provisionamento dos recursos"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "Tipo da instância EC2"
  type        = string
  default     = "t3.micro"
}

variable "project_name" {
  description = "Nome do projeto para identificação e tags"
  type        = string
  default     = "ChaosPlanning"
}
